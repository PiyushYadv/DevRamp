import os
from tree_sitter import Node
from app.parsers.tree_sitter import get_parser_and_lang
from app.schemas.ingestion import SemanticChunk

class ASTChunker:
    # Target nodes we want to extract as complete chunks
    TARGET_NODE_TYPES = {
        "python": ["function_definition", "class_definition", "async_function_definition"],
        "javascript": ["function_declaration", "class_declaration", "arrow_function", "method_definition"],
        "typescript": ["function_declaration", "class_declaration", "interface_declaration", "type_alias_declaration", "method_definition"]
    }

    def extract_chunks(self, repo_path: str, repo_id: str, commit_sha: str) -> list[SemanticChunk]:
        chunks = []
        for root, _, files in os.walk(repo_path):
            # Skip hidden directories like .git
            if ".git" in root:
                continue
                
            for file in files:
                ext = os.path.splitext(file)[1]
                parser, lang_name = get_parser_and_lang(ext)
                
                if not parser:
                    continue # Skip unsupported files

                file_path = os.path.join(root, file)
                rel_path = os.path.relpath(file_path, repo_path)
                
                with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                    content = f.read()
                    
                tree = parser.parse(bytes(content, "utf8"))
                
                # Traverse AST and extract targeted semantic blocks
                extracted = self._traverse_and_extract(
                    tree.root_node, content, lang_name, repo_id, rel_path, commit_sha
                )
                chunks.extend(extracted)
                
        return chunks

    def _traverse_and_extract(
        self, node: Node, source_code: str, lang_name: str, 
        repo_id: str, rel_path: str, commit_sha: str
    ) -> list[SemanticChunk]:
        chunks = []
        
        # If this node is one of our target types, extract it
        if node.type in self.TARGET_NODE_TYPES.get(lang_name, []):
            start_byte = node.start_byte
            end_byte = node.end_byte
            chunk_content = source_code[start_byte:end_byte]
            
            # Attempt to find the symbol name (e.g., function name)
            symbol_name = None
            for child in node.children:
                if child.type == "identifier" or child.type == "name":
                    symbol_name = source_code[child.start_byte:child.end_byte]
                    break

            chunks.append(SemanticChunk(
                repo_id=repo_id,
                path=rel_path.replace("\\", "/"), # Enforce contract requirement for forward slashes
                language=lang_name,
                node_type=node.type,
                symbol=symbol_name,
                start_line=node.start_point.row + 1, # Tree-sitter is 0-indexed
                end_line=node.end_point.row + 1,
                content=chunk_content,
                commit_sha=commit_sha
            ))
            
            # Do not traverse inside the function/class to avoid nested duplicate chunks
            return chunks

        # Otherwise, keep digging down the tree
        for child in node.children:
            chunks.extend(self._traverse_and_extract(
                child, source_code, lang_name, repo_id, rel_path, commit_sha
            ))
            
        return chunks