import siteConfig from '@generated/docusaurus.config';
import type * as PrismNamespace from 'prismjs';
import type {Optional} from 'utility-types';

// Swizzled (ejected) copy of the classic theme hook: loads the configured
// `additionalLanguages` and then registers the custom `zell` grammar.
export default function prismIncludeLanguages(
  PrismObject: typeof PrismNamespace,
): void {
  const {
    themeConfig: {prism},
  } = siteConfig;
  const {additionalLanguages} = prism as {additionalLanguages: string[]};

  const PrismBefore = globalThis.Prism;
  globalThis.Prism = PrismObject;
  additionalLanguages.forEach((lang) => {
    if (lang === 'php') {
      require('prismjs/components/prism-markup-templating.js');
    }
    require(`prismjs/components/prism-${lang}`);
  });

  registerZell(PrismObject);

  delete (globalThis as Optional<typeof globalThis, 'Prism'>).Prism;
  if (typeof PrismBefore !== 'undefined') {
    globalThis.Prism = PrismObject;
  }
}

function registerZell(Prism: typeof PrismNamespace): void {
  const types =
    'int|int8|int16|int32|int64|uint|uint8|uint16|uint32|uint64|uintptr|float|float32|float64|' +
    'bool|byte|rune|string|any|error|void';
  Prism.languages.zell = {
    comment: [
      {pattern: /\/\*[\s\S]*?\*\//, greedy: true},
      {pattern: /\/\/.*/, greedy: true},
    ],
    string: [
      // raw strings
      {pattern: /`[^`]*`/, greedy: true},
      {
        pattern: /"(?:\\.|[^\\"\r\n])*"/,
        greedy: true,
        inside: {
          escape: /\\(?:u\{[0-9A-Fa-f]+\}|[nrt0\\"'])/,
          placeholder: {pattern: /\{[0-9]+\}/, alias: 'variable'},
        },
      },
      {pattern: /'(?:\\.|[^\\'\r\n])+'/, greedy: true, alias: 'char'},
    ],
    attribute: {
      pattern: /@[A-Za-z_][\w.]*/,
      alias: 'annotation',
    },
    'class-name': [
      {
        pattern: /(\b(?:struct|interface|enum|new)\s+)[A-Za-z_]\w*/,
        lookbehind: true,
      },
      {
        pattern: /(\b(?:namespace|import)\s+)[A-Za-z_]\w*(?:\.[A-Za-z_]\w*)*/,
        lookbehind: true,
        alias: 'namespace',
      },
      // Built-in types, optionally followed by the error marker `!`
      new RegExp('\\b(?:' + types + ')\\b'),
      // Capitalised identifiers are types by convention
      /\b[A-Z][A-Za-z0-9_]*(?=!|\?|\[|\s*[{)\],]|\s+[a-z]|$)/,
    ],
    keyword: [
      /\b(?:if|else|switch|case|default|return|break|continue|defer|for|in|try|catch|async|await|go)\b/,
      /\b(?:struct|interface|enum|func|var|const|map|namespace|import|static|new|weak|chan|select|as|this|type)\b/,
    ],
    builtin: /\b(?:error|panic|append|len|cap|typeof|println|print|make|delete|copy)\b(?=\s*\()/,
    boolean: /\b(?:true|false)\b/,
    constant: /\bnil\b/,
    function: /\b[A-Za-z_]\w*(?=\s*(?:<[^>\n]*>)?\()/,
    number: /\b(?:0[xX][0-9A-Fa-f_]+|0[bB][01_]+|0[oO][0-7_]+|\d[\d_]*(?:\.\d[\d_]*)?(?:[eE][+-]?\d+)?)\b/,
    // `T!` result types and the `?` propagation operator
    'error-operator': {pattern: /!(?=\s|\)|,|\{|$)|\?(?=[\s.(;,)]|$)/, alias: 'operator'},
    operator: /&&|\|\||<<|>>|[=!<>+\-*\/%&|^]=?|:=|->|<-|\.\.\.?/,
    punctuation: /[{}[\];(),.:]/,
  };
  Prism.languages.zl = Prism.languages.zell;
}
