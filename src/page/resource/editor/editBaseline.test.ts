import {
  contentToTiptapJson,
  type TiptapJsonContent,
} from '@import-ai/omnibox-editor';

import { toComparableDocument } from './contentComparison';
import { buildEditBaseline } from './editBaseline';

jest.mock('@import-ai/omnibox-editor', () => ({
  contentToTiptapJson: jest.fn(),
}));

describe('buildEditBaseline', () => {
  it('applies editor schema defaults to a draft baseline', () => {
    const parsed: TiptapJsonContent = {
      type: 'doc',
      content: [{ type: 'orderedList' }],
    };
    const withDefaults: TiptapJsonContent = {
      type: 'doc',
      content: [{ type: 'orderedList', attrs: { start: 1, type: null } }],
    };
    const schema = {
      nodeFromJSON: jest.fn(() => ({ toJSON: () => withDefaults })),
    };
    jest.mocked(contentToTiptapJson).mockReturnValue(parsed);

    const baseline = buildEditBaseline({
      resourceId: 'resource',
      name: 'Document',
      content: '1. Item',
      linkBase: '/namespace/resource',
      schema,
    });

    expect(schema.nodeFromJSON).toHaveBeenCalledWith(parsed);
    expect(baseline.comparableDocument).toBe(
      toComparableDocument(withDefaults)
    );
  });

  it('uses the live editor document directly when available', () => {
    const liveDocument: TiptapJsonContent = {
      type: 'doc',
      content: [{ type: 'paragraph' }],
    };
    const schema = { nodeFromJSON: jest.fn() };

    const baseline = buildEditBaseline({
      resourceId: 'resource',
      name: 'Document',
      content: 'Server body',
      linkBase: '/namespace/resource',
      document: liveDocument,
      schema,
    });

    expect(schema.nodeFromJSON).not.toHaveBeenCalled();
    expect(baseline.comparableDocument).toBe(
      toComparableDocument(liveDocument)
    );
  });
});
