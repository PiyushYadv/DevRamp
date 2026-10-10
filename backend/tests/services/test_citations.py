from app.services.chat.citations import CitationExtractor

VALID = {"src/auth/jwt.py", "src/app.ts"}


def extractor():
    return CitationExtractor(lambda p: p in VALID)


def test_citation_split_across_deltas_is_emitted_once_complete():
    ex = extractor()
    assert ex.feed("Tokens are signed in [file:src/au") == []
    assert ex.feed("th/jwt.py:L4") == []
    (citation,) = ex.feed("2] and more.")

    assert citation == {"file": "src/auth/jwt.py", "line": 42, "label": "src/auth/jwt.py:L42"}


def test_ranges_dedupe_and_both_range_styles():
    ex = extractor()
    out = ex.feed("[file:src/app.ts:L3-L9] then [file:src/app.ts:L3-9] and again [file:src/app.ts:L3-L9]")

    assert out == [{"file": "src/app.ts", "line": 3, "endLine": 9, "label": "src/app.ts:L3-L9"}]


def test_hallucinated_paths_and_bad_lines_are_dropped():
    ex = extractor()
    out = ex.feed("[file:src/made_up.py:L1] [file:src/app.ts:L0] [file:src/app.ts:L5-L2] [file:/src/app.ts:L7]")

    # L0 dropped, reversed range collapses to a single line, leading slash normalized
    assert [c["label"] for c in out] == ["src/app.ts:L5", "src/app.ts:L7"]


def test_plain_brackets_do_not_stall_scanning():
    ex = extractor()
    ex.feed("Use arr[0] and [link](x) then ")
    (citation,) = ex.feed("[file:src/auth/jwt.py:L1]")

    assert citation["line"] == 1
    assert ex.citations == [citation]


def test_citations_without_l_prefix_are_accepted():
    (citation,) = extractor().feed("See [file:src/auth/jwt.py:244-256].")

    assert citation == {"file": "src/auth/jwt.py", "line": 244, "endLine": 256, "label": "src/auth/jwt.py:L244-L256"}
