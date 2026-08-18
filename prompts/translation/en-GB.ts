import {Str} from 'expensify-common';

import Glossary from './Glossary';

const britishEnglishGlossary = new Glossary([
    // Branded product names are never localized
    {sourceTerm: 'Expensify Card', targetTerm: 'Expensify Card', usage: 'Branded Expensify payment card'},
]);

export default Str.dedent(`
    When translating to British English (en-GB), follow these rules:

    - The source text is US English. Only change spelling, punctuation, and terminology where American and British English genuinely differ; if a string is identical in both variants, return it unchanged.
    - Use British spelling conventions (e.g. "organise" rather than "organize", "colour" rather than "color", "centre" rather than "center", "licence" as a noun).
    - Use British terminology where it differs from American usage (e.g. "postcode" rather than "ZIP code", "mobile" rather than "cell phone").
    - Keep the source phrasing and tone. Do not rephrase, shorten, or expand strings.
    - Do not change placeholders, branded product names, currency symbols, or currency names.

    Use the following glossary for canonical British English translations of common terms:

    ${britishEnglishGlossary.toXML()}
`);
