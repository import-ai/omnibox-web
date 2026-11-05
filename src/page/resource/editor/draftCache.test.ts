/** @jest-environment jsdom */

import { getCache, updateCacheContent, updateCacheTitle } from './cache';
import { updateResourceEditorDraft } from './draftCache';

describe('updateResourceEditorDraft', () => {
  beforeEach(() => localStorage.clear());

  it('removes both draft fields after reverting all changes', () => {
    updateCacheTitle('resource', 'Original');
    updateCacheContent('resource', 'Original body');

    updateResourceEditorDraft({
      resourceId: 'resource',
      title: 'Original',
      baselineTitle: 'Original',
      content: 'Original body',
      bodyChanged: false,
    });

    expect(getCache('resource')).toBeNull();
  });

  it('removes an empty title draft after reverting to the original empty title', () => {
    updateCacheTitle('resource', 'Temporary');

    updateResourceEditorDraft({
      resourceId: 'resource',
      title: '',
      baselineTitle: '',
      content: '',
      bodyChanged: false,
    });

    expect(getCache('resource')).toBeNull();
  });

  it('keeps only a changed title when the body is reverted', () => {
    updateCacheContent('resource', 'Changed body');

    updateResourceEditorDraft({
      resourceId: 'resource',
      title: 'Renamed',
      baselineTitle: 'Original',
      content: 'Original body',
      bodyChanged: false,
    });

    expect(getCache('resource')).toEqual({ title: 'Renamed' });
  });

  it('keeps only changed body content when the title is reverted', () => {
    updateCacheTitle('resource', 'Renamed');

    updateResourceEditorDraft({
      resourceId: 'resource',
      title: 'Original',
      baselineTitle: 'Original',
      content: 'Changed body',
      bodyChanged: true,
    });

    expect(getCache('resource')).toEqual({ content: 'Changed body' });
  });
});
