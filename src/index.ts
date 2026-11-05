import { ConnectedApprovalPlugin, type ConnectedContactLookup } from './plugin.js';
export function createPlugin(host: ConnectedContactLookup) { return new ConnectedApprovalPlugin('imcp', host); }

