import {Str} from 'expensify-common';

import Glossary from './Glossary';

const spainSpanishGlossary = new Glossary([
    {sourceTerm: 'Rate', targetTerm: 'Tasa', partOfSpeech: 'noun', usage: 'Financial or tax rate'},
    {sourceTerm: 'Switch accounts', targetTerm: 'cambiar de cuenta'},
]);

export default Str.dedent(`
    When translating to Spanish from Spain (es-ES), follow these rules:

    - Use European Spanish (Castilian) conventions rather than Latin American ones.
    - Always use the informal tú and not the more formal usted form. Use vosotros for the informal plural where it appears.
    - Prefer Spain-specific vocabulary where it differs from Latin American usage (e.g. "ordenador" rather than "computadora", "móvil" rather than "celular").
    - Prefer clear, natural Spanish for the product locale; keep branded names (Expensify, Concierge, QuickBooks Online, New Expensify, Expensify Classic) as in the source unless the glossary says otherwise.

    Use the following glossary for canonical Spanish (Spain) translations of common terms:

    ${spainSpanishGlossary.toXML()}
`);
