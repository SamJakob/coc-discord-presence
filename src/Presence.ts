export interface IPresence {
	action: string;
	currentFile?: string;
	workspaceName?: string;
	startTime?: Date;
	languageName?: string;
	languageIcon?: string;
}

export interface IDiscordPresence {
	details: string;
	state: string;
	startTimestamp?: number;
	smallImageKey?: string;
	smallImageText?: string;
	largeImageKey?: string;
	largeImageText?: string;
}

export function toDiscordPresence(presence: IPresence): IDiscordPresence {
	let workspaceName = !!presence.workspaceName ? `Workspace: ${presence.workspaceName}` : `No Workspace`;

	return {
		details: `${presence.action}${!!presence.currentFile ? ': ' + presence.currentFile : ''}`,
		state: workspaceName,
		startTimestamp: !!presence.startTime ? Math.ceil(presence.startTime.getTime() / 1000) : undefined,
		largeImageKey: presence.languageIcon ?? 'unknown',
		largeImageText: presence.languageName ?? presence.currentFile ?? workspaceName,
		smallImageKey: 'logo',
		smallImageText: 'SamVIM',
	};
}
