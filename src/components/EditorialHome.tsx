import Link from "next/link";

import { getPublishedPosts } from "@/lib/domain/blog";
import { readingMinutes } from "@/lib/markdown";

import { EDITORIAL_TOPICS, coverFor, topicLabel, type EditorialTopic } from "@/lib/editorial";

export async function EditorialHome({ topic }: { topic?: EditorialTopic }) {
  const allPosts = await getPublishedPosts(200);
  const posts = allPosts.filter((post) => !topic || post.topic === topic).sort((a, b) => Number(b.featured) - Number(a.featured));
  const [lead, ...rest] = posts;
  const notes = topic ? rest.slice(0,2) : [rest.find(post=>post.topic==="business"),rest.find(post=>post.topic==="creativity")].filter((post): post is NonNullable<typeof post>=>Boolean(post));
  const remaining = rest.filter(post=>!notes.some(note=>note.id===post.id));
  const fresh = topic ? remaining : EDITORIAL_TOPICS.flatMap(item=>remaining.filter(post=>post.topic===item.slug).slice(0,2));

  return (
    <div className="journal-shell">
      <header className="journal-intro"><h1>{topic ? `${topicLabel(topic)} perspectives` : "An independent editorial for ambitious people."}</h1><p>Curiosity. Craft. A little perspective.</p></header>
      <nav aria-label="Editorial topics" className="journal-topics">
        <Link href="/" aria-current={!topic ? "page" : undefined}>The latest <span>↗</span></Link>
        {EDITORIAL_TOPICS.map((item) => <Link key={item.slug} href={`/topics/${item.slug}`} aria-current={topic === item.slug ? "page" : undefined}>{item.label}</Link>)}
        <Link href="/tools" className="journal-board-link">Tools for your next step ↗</Link>
      </nav>

      {topic ? <div className="journal-topic-intro"><p className="journal-label">Explore the editorial</p><h2>{topicLabel(topic)}<span>.</span></h2><p>{EDITORIAL_TOPICS.find(item => item.slug === topic)?.description}</p></div> : null}

      {lead ? <section className="journal-lead" aria-label="Lead story">
        <Link href={`/blog/${lead.slug}`} className="journal-lead-story">
          <div className="journal-lead-copy">
            <p className="journal-label"><span className="journal-status-dot" /> {topicLabel(lead.topic)} · The lead story</p>
            <h2>{lead.title}</h2>
            <p className="journal-dek">{lead.excerpt}</p>
            <div className="journal-story-meta"><span>{readingMinutes(lead.markdownBody)} min read</span><span className="journal-arrow">↗</span></div>
          </div>
          <div className="journal-lead-image">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={coverFor(lead)} alt={lead.coverAlt || ""} width={1536} height={1024} fetchPriority="high" />
          </div>
        </Link>
        <aside className="journal-notes">
          <p className="journal-label">Worth your time</p>
          {notes.map((post, index) => <Link href={`/blog/${post.slug}`} key={post.id} className="journal-note">
            <span className="journal-number">0{index + 1}</span>
            <h3>{post.title}</h3>
            <p>{readingMinutes(post.markdownBody)} min read <span>↗</span></p>
          </Link>)}
          <div className="journal-note-signoff">A little perspective.<br />A lot to put to work.</div>
        </aside>
      </section> : <section className="journal-empty"><p className="journal-label">{topic ? topicLabel(topic) : "The editorial"}</p><h2>Good questions.<br />Better ways forward.</h2><p>{topic ? `Our ${topicLabel(topic).toLowerCase()} stories are on their way. Explore the latest from the rest of the editorial.` : "Our first stories are on their way. Original perspectives on building a business, doing meaningful work, and growing a practice."}</p>{topic ? <Link href="/" className="buy mt-6">Read the latest ↗</Link> : null}</section>}

      {fresh.length > 0 ? <section id="latest" className="journal-latest">
        <div className="journal-section-title"><h2>Fresh perspectives<span>.</span></h2><p>Take something useful with you.</p></div>
        <div className="journal-grid">{fresh.map((post, index) => <article key={post.id} className="journal-card">
          <Link href={`/blog/${post.slug}`}>
            <div className={`journal-card-image journal-card-tone-${index % 3}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={coverFor(post)} alt={post.coverAlt || ""} width={1536} height={1024} loading="lazy" />
              <span className="journal-card-arrow">↗</span>
            </div>
            <p className="journal-label">{topicLabel(post.topic)} <span>{readingMinutes(post.markdownBody)} min</span></p>
            <h3>{post.title}</h3><p className="journal-card-excerpt">{post.excerpt}</p>
          </Link>
        </article>)}</div>
      </section> : null}
      <section className="journal-tool-feature"><div><p className="journal-label">From perspective to progress · CoachRank Tools</p><h2>Your next chapter starts<br />with a clearer brand.</h2><p>Your next three moves. A seven-day clarity plan. A visual report you can return to and compare, whenever you need a fresh perspective.</p></div><div><p className="journal-tool-price">$9 <span>USD · one time</span></p><Link href="/tools/brand-clarity" className="tool-button">Discover your brand gaps ↗</Link><Link href="/tools/brand-clarity/sample" className="tool-text-link">Explore a sample report</Link></div></section>
      {!topic ? <section className="journal-topic-directory"><div className="journal-section-title"><h2>Find your perspective<span>.</span></h2><p>Five ways into the work.</p></div><div>{EDITORIAL_TOPICS.map(item=><Link key={item.slug} href={`/topics/${item.slug}`}><span>{allPosts.filter(post=>post.topic===item.slug).length} articles</span><h3>{item.label}<span>↗</span></h3><p>{item.description}</p></Link>)}</div></section> : null}
      <section className="journal-manifesto"><p className="journal-label">The CoachRank point of view</p><p>Greatness has a backstory.<br /><span>Let’s understand it.</span></p><Link href="/about">What we believe ↗</Link></section>
    </div>
  );
}
