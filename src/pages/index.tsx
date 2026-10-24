import React, {type ReactNode} from 'react';
import Link from '@docusaurus/Link';
import Layout from '@theme/Layout';
import CodeBlock from '@theme/CodeBlock';
import useBaseUrl from '@docusaurus/useBaseUrl';
import landing from '../../generated/landing.json';
import styles from './index.module.css';

/** Renders the small Markdown subset used by the README bullets. */
function inline(md: string): ReactNode[] {
  const parts: ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let k = 0;
  while ((m = re.exec(md))) {
    if (m.index > last) parts.push(md.slice(last, m.index));
    const t = m[0];
    if (t.startsWith('**')) parts.push(<strong key={k++}>{t.slice(2, -2)}</strong>);
    else if (t.startsWith('`')) parts.push(<code key={k++}>{t.slice(1, -1)}</code>);
    else {
      const [, label, href] = /\[([^\]]+)\]\(([^)]+)\)/.exec(t)!;
      parts.push(<a key={k++} href={href}>{label}</a>);
    }
    last = m.index + t.length;
  }
  if (last < md.length) parts.push(md.slice(last));
  return parts;
}

const cards = [
  {title: 'Guide', text: 'Install Zell, write a first program, then the tour, errors, async, memory, packages and testing.', to: '/guide/getting-started'},
  {title: 'Specification', text: 'The language definition: syntax, types, errors, memory, async, reflection. Written in Russian.', to: '/spec'},
  {title: 'Standard library', text: 'API reference for every namespace: signatures, doc comments and runnable examples.', to: '/std'},
  {title: 'Design docs', text: 'Tooling, package manager, framework, platforms, security and reflection plans.', to: '/design/tooling'},
  {title: 'Examples', text: 'Runnable programs and showcase repositories: a REST service, a CLI, a worker pool.', to: '/examples'},
  {title: 'Editors', text: 'VS Code, IntelliJ IDEA and any editor with an LSP client.', to: '/editors'},
];

export default function Home(): ReactNode {
  return (
    <Layout title="The Zell programming language" description="Zell documentation: guides, language specification and standard library reference.">
      <header className={styles.hero}>
        <div className="container">
          <div className={styles.heroGrid}>
            <div>
              <img src={useBaseUrl('/img/logo.svg')} alt="" width={56} height={56} />
              <h1 className={styles.title}>Zell</h1>
              <p className={styles.lead}>{inline(landing.lead)}</p>
              <div className={styles.buttons}>
                <Link className="button button--primary button--lg" to="/guide/getting-started">Get started</Link>
                <Link className="button button--secondary button--lg" to="/download">Download</Link>
                <Link className="button button--outline button--secondary button--lg" to="/guide/tour">Tour of Zell</Link>
              </div>
              <CodeBlock language="sh" className={styles.install}>
                {'curl -fsSL https://raw.githubusercontent.com/zell-lang/zell/master/scripts/install.sh | sh'}
              </CodeBlock>
            </div>
            <CodeBlock language="zell" title="hello.zl">{landing.code}</CodeBlock>
          </div>
        </div>
      </header>
      <main className="container">
        <section className={styles.features}>
          <ul className={styles.list}>
            {landing.bullets.map((b, i) => (
              <li key={i}>{inline(b)}</li>
            ))}
          </ul>
        </section>
        <section className={styles.cards}>
          {cards.map((c) => (
            <Link key={c.to} to={c.to} className={styles.card} style={{color: 'inherit', textDecoration: 'none'}}>
              <h3>{c.title}</h3>
              <p>{c.text}</p>
            </Link>
          ))}
        </section>
      </main>
    </Layout>
  );
}
