---
---

document.addEventListener('DOMContentLoaded', function () {
    var input = document.getElementById('searchbar');
    var results = document.getElementById('search-results');
    var group = document.getElementById('posts-labelgroup');
    if (!input || !results || !group) return;

    SimpleJekyllSearch({
        searchInput: input,
        resultsContainer: results,
        json: '{{ "/search.json" | relative_url }}',
        searchResultTemplate: '<a href="{url}">{title}</a>',
        noResultsText: '검색 결과가 없습니다.'
    });

    function openResults() {
        results.style.display = '';
        group.classList.add('focus-within');
    }
    function closeResults() {
        results.style.display = 'none';
        group.classList.remove('focus-within');
    }
    input.addEventListener('focus', openResults);
    input.addEventListener('input', openResults);
    input.addEventListener('keydown', function (event) {
        if (event.key === 'Escape') closeResults();
    });
    document.addEventListener('click', function (event) {
        if (!group.contains(event.target)) closeResults();
    });
    group.addEventListener('focusout', function (event) {
        if (!group.contains(event.relatedTarget)) closeResults();
    });
});
