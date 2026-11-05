import { describe, expect, it, vi } from 'vitest';

import { validatePluginDescription } from './sdk/validate-output.js';

import {
  CONNECTED_TOOL_DEFINITIONS,
  ConnectedApprovalPlugin,
  connectedApprovalPlugins,
  type ConnectedPluginId,
} from './plugin.js';

function input(toolName: string, args: Record<string, unknown> = {}) {
  return {
    upstreamId: 'upstream-1',
    upstreamAlias: 'connected',
    toolName,
    arguments: args as Record<string, string | boolean | number>,
  };
}

describe('connected approval plugins', () => {

  it('validates every supported tool presentation', async () => {
    expect(connectedApprovalPlugins().map((plugin) => plugin.id)).toEqual([
      'imcp',
    ]);
    for (const [id, definitions] of Object.entries(CONNECTED_TOOL_DEFINITIONS)) {
      const plugin = new ConnectedApprovalPlugin(id as ConnectedPluginId);
      for (const name of Object.keys(definitions)) {
        const result = validatePluginDescription(await plugin.describe(input(name)));
        expect(result.source).toBe('plugin');
        expect(result.title.fallback.en).toBeTruthy();
        expect(result.title.fallback.cs).toBeTruthy();
      }
    }
  });

  it('shows every supplied parameter in the readable request section across all connected plugins', async () => {
    for (const [id, definitions] of Object.entries(CONNECTED_TOOL_DEFINITIONS)) {
      const plugin = new ConnectedApprovalPlugin(id as ConnectedPluginId);
      for (const toolName of Object.keys(definitions)) {
        const result = await plugin.describe(input(toolName, {
          page: 3, offset: 40, limit: 20, futureFlag: true,
        }));
        const fields = result.sections.find((section) => section.id === 'request')?.fields ?? [];
        for (const [key, value] of Object.entries({ page: 3, offset: 40, limit: 20, futureFlag: true })) {
          expect(fields, `${id}.${toolName} omits ${key}`).toContainEqual(
            expect.objectContaining({ value }),
          );
        }
      }
    }
  });

  it('identifies a calendar deletion only from an exact event and occurrence match', async () => {
    const identifier = '850BC08E-A873-4728-82D6-A42E8C4E7637:D12CE56E-89BC-40BE-8AFA-74E99C761667';
    const findCalendarEvents = vi.fn().mockResolvedValue({ content: [{ text: JSON.stringify([
      { identifier: 'other', name: 'Wrong event', startDate: '2026-10-17T20:00:00+02:00' },
      { identifier, name: 'Previous occurrence', startDate: '2026-10-10T20:00:00+02:00' },
      { identifier, name: 'Kontrola u lékaře', startDate: '2026-10-17T20:00:00+02:00',
        endDate: '2026-10-17T21:00:00+02:00', calendar: { name: 'Soukromý' } },
    ]) }] });
    const plugin = new ConnectedApprovalPlugin('imcp', { findContact: vi.fn(), findCalendarEvents });
    const result = await plugin.describe(input('events_delete', {
      identifier, start: '2026-10-17T20:00', span: 'futureEvents',
    }));

    expect(findCalendarEvents).toHaveBeenCalledOnce();
    expect(result.title.params?.['target']).toBe('Kontrola u lékaře');
    expect(result.sections[0]?.fields).toEqual(expect.arrayContaining([
      expect.objectContaining({ value: 'Kontrola u lékaře' }),
      expect.objectContaining({ value: 'Soukromý' }),
      expect.objectContaining({ value: 'futureEvents' }),
      expect.objectContaining({ value: identifier }),
    ]));
    expect(result.proposedScopes).toEqual([]);
  });

  it('does not present an opaque calendar ID or unrelated event as the deletion title', async () => {
    const identifier = '850BC08E-A873-4728-82D6-A42E8C4E7637:D12CE56E-89BC-40BE-8AFA-74E99C761667';
    const plugin = new ConnectedApprovalPlugin('imcp', {
      findContact: vi.fn(),
      findCalendarEvents: vi.fn().mockResolvedValue({ events: [
        { identifier: 'other', name: 'Cizí schůzka' },
      ] }),
    });
    const result = await plugin.describe(input('events_delete', { identifier }));

    expect(result.title.params?.['target']).toBeUndefined();
    expect(result.title.fallback.cs).toBe('Smazat událost z kalendáře');
    expect(result.sections[0]?.fields).toEqual(expect.arrayContaining([
      expect.objectContaining({ value: null }),
      expect.objectContaining({ value: 'thisEvent' }),
      expect.objectContaining({ value: identifier }),
    ]));
  });

  it('shows the contact name for a macOS phone call when the number matches', async () => {
    const plugin = new ConnectedApprovalPlugin('imcp', {
      findContact: vi.fn().mockResolvedValue({ structuredContent: {
        contacts: [{ displayName: 'Petr Svoboda', phoneNumbers: [{ value: '+420 777 123 456' }] }],
      } }),
    });
    const result = await plugin.describe(input('phone_call', { phoneNumber: '+420777123456' }));

    expect(result.sections[0]?.fields[0]?.value).toEqual({ id: '+420777123456', name: 'Petr Svoboda' });
    expect(result.title.params?.['target']).toBe('Petr Svoboda (+420777123456)');
  });

});

