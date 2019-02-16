import { store, updatePapers } from '../state';

store.subscribe(handleRequest);

async function handleRequest() {
  let allPapers = Object.values(store.getState().data.Papers);
  let toQuery = allPapers.filter(p => !p.crossref);
  console.log(toQuery);
  if (toQuery.length) {
    let updatedPapers = (await getMetadata(toQuery)).map(parsePaper);
    store.dispatch(updatePapers(updatedPapers));
  }
}

export function getMetadata(papers) {
  let dois = papers.filter(p => p.doi);
  if (dois.length) {
    let query = dois.map(p => `doi:${p.doi}`).join();
    let base = 'https://api.crossref.org/works?rows=1000&filter=';
    return fetch(base + query)
      .then(resp => resp.json())
      .then(json => {
        return json.message.items;
      });
  } else {
    return [];
  }
}

export function crossrefSearch(input) {
  let query = input.replace(' ', '+');
  let url = `https://api.crossref.org/works?query=${query}`;
  return fetch(url)
    .then(resp => resp.json())
    .then(json => {
      const items = json.message.items.map(parsePaper);
    });
}

export function parsePaper(response) {
  let date = response['published-print'] ? response['published-print'] : response['created'];

  return {
    doi: response.DOI,
    title: response.title ? response.title[0] : 'unavailable',
    author: response.author ? response.author[0].family : '',
    month: date['date-parts'][0][1],
    year: date['date-parts'][0][0],
    timestamp: new Date(date['date-time']),
    journal: response['container-title'] ? response['container-title'][0] : '',
    citationCount: response['is-referenced-by-count'],
    references: response['reference'] ? response['reference'].map(parseReference) : false,
    crossref: true
  };
}

export function parseReference(ref) {
  return {
    doi: ref.DOI ? ref.DOI : null,
    title: ref['article-title'] ? ref['article-title'] : 'unavailable',
    author: ref.author ? ref.author : null,
    year: ref.year ? ref.year : null,
    journal: ref['journal-title'] ? ref['journal-title'] : null
  };
}
