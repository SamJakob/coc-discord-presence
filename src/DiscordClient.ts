import { WorkspaceConfiguration } from 'coc.nvim';
import DiscordRPC from 'discord-rpc';

import { IPresence, toDiscordPresence } from './Presence';

export class DiscordClient {
	private config: WorkspaceConfiguration;
	private rpc: DiscordRPC.Client;

	private _connected: boolean;
	get connected(): boolean {
		return this._connected;
	}

	get username(): string | null {
		if (this._connected) return `${this.rpc.user.username}#${this.rpc.user.discriminator}`;
		else return null;
	}

	constructor(config: WorkspaceConfiguration) {
		this._connected = false;
		this.config = config;
	}

	async connect(): Promise<void> {
		this.rpc = new DiscordRPC.Client({ transport: 'ipc' });

		return new Promise((resolve, reject) => {
			this.rpc.on('ready', () => {
				this._connected = true;
				resolve();
			});

			this.rpc.login({ clientId: '805896688786866185' }).catch((err) => reject(err.toString()));
		});
	}

	disconnect(): void {
		this.rpc?.destroy();
		this._connected = false;
	}

	setPresence(presence: IPresence): void {
		if (this._connected) {
			this.rpc.setActivity({
				instance: false,
				...toDiscordPresence(presence),
			});
		}
	}
}
