import { useMemo, useState } from 'react';
import { BLOCKS, BLOCK_CATEGORIES, WORKFLOW_TEMPLATES, type BlockDef } from '../lib/blocks';

interface BlocksPanelProps {
  onInsertBlock: (blockId: string) => void;
  onInsertTemplate: (templateId: string) => void;
  onClose: () => void;
  anchorLabel: string | null;
}

const KIND_DOT: Record<string, string> = {
  start: '#0f766e',
  agent: '#b1490f',
  subagent: '#d98a52',
  tool: '#4b6a8a',
  decision: '#8a4a6b',
  end: '#8f2d20',
};

function BlockRow({ block, onInsert }: { block: BlockDef; onInsert: () => void }) {
  return (
    <div className="block-row">
      <div className="block-row-head">
        <span className="block-dot" style={{ background: KIND_DOT[block.kind] ?? '#b1490f' }} />
        <span className="block-title">{block.title}</span>
        <span className="block-kind">{block.kind}</span>
      </div>
      <p className="block-blurb">{block.blurb}</p>
      <button onClick={onInsert}>Add step</button>
    </div>
  );
}

export default function BlocksPanel({ onInsertBlock, onInsertTemplate, onClose, anchorLabel }: BlocksPanelProps) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<string>('All');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return BLOCKS.filter((b) => {
      if (category !== 'All' && b.category !== category) return false;
      if (!q) return true;
      return (
        b.title.toLowerCase().includes(q) ||
        b.blurb.toLowerCase().includes(q) ||
        b.prompt.toLowerCase().includes(q)
      );
    });
  }, [query, category]);

  const filteredTemplates = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return WORKFLOW_TEMPLATES;
    return WORKFLOW_TEMPLATES.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q),
    );
  }, [query]);

  return (
    <div className="blocks-panel">
      <div className="blocks-header">
        <div>
          <h3>Building blocks</h3>
          <p className="blocks-sub">
            {anchorLabel ? `Inserts after “${anchorLabel}”` : 'Select a node, or inserts at the end'}
          </p>
        </div>
        <button className="blocks-close" onClick={onClose} title="Hide blocks">
          ×
        </button>
      </div>

      <input
        className="blocks-search"
        placeholder="Search blocks… (e.g. review, tdd, spec)"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      <div className="blocks-section">
        <h4>Workflow templates</h4>
        {filteredTemplates.map((t) => (
          <div key={t.id} className="template-row">
            <div className="template-title">{t.title}</div>
            <p className="block-blurb">{t.description}</p>
            <button onClick={() => onInsertTemplate(t.id)}>Insert {t.steps.length} steps</button>
          </div>
        ))}
        {filteredTemplates.length === 0 && <p className="block-blurb">No templates match “{query}”.</p>}
      </div>

      <div className="blocks-filter">
        {['All', ...BLOCK_CATEGORIES].map((c) => (
          <button
            key={c}
            className={category === c ? 'active' : ''}
            onClick={() => setCategory(c)}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="blocks-section">
        <h4>Single steps ({filtered.length})</h4>
        {filtered.map((b) => (
          <BlockRow key={b.id} block={b} onInsert={() => onInsertBlock(b.id)} />
        ))}
        {filtered.length === 0 && <p className="block-blurb">No blocks match “{query}”.</p>}
      </div>
    </div>
  );
}
