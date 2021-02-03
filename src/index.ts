import { commands, ExtensionContext, window, workspace, WorkspaceConfiguration } from 'coc.nvim';
import { basename } from 'path';
import fs from 'fs';

import { DiscordClient } from './DiscordClient';
import { getIcon } from './Icon';

const config: WorkspaceConfiguration = workspace.getConfiguration('coc-discord-presence');
const client: DiscordClient = new DiscordClient(config);

enum BufferState {
	IDLING = 'Idling',
	EDITING = 'Editing',
	VIEWING = 'Viewing',
}

enum FocusState {
	GAINED,
	LOST,
}

let updateIntervalId: NodeJS.Timeout;
let inactiveIntervalId: NodeJS.Timeout;
let workspaceOpenTime: Date | undefined;

let bufferState: BufferState;
let focusState: FocusState;

async function updateClientState(): Promise<void> {
	const currentState = await workspace.getCurrentState();

	let fileName = basename(currentState.document.uri);
	// let workspaceName = workspace.getWorkspaceFolder(currentState.document.uri)?.name ?? undefined;
	let workspaceName = workspace.workspaceFolder?.name ?? undefined;

	let pseudoBufferState = bufferState; // allows the buffer state to be overridden by the focus state.
	if (focusState !== FocusState.GAINED) pseudoBufferState = BufferState.IDLING;

	let languageIcon = getIcon(currentState?.document?.languageId, fileName, workspace);

	try {
		client.setPresence({
			action: pseudoBufferState,
			currentFile: pseudoBufferState !== BufferState.IDLING ? fileName : undefined,
			workspaceName: workspaceName,
			startTime: workspaceOpenTime,
			languageName: languageIcon,
			languageIcon,
		});
	} catch (ex) {}
}

async function updateInactiveDetector(): Promise<void> {
	// If there is an existing timeout, clear it.
	if (inactiveIntervalId) clearTimeout(inactiveIntervalId);

	// Mark the user as active, if that's not already the case (and if it isn't, update the client state).
	if (focusState !== FocusState.GAINED) {
		focusState = FocusState.GAINED;
		await updateClientState();
	}

	// Set up the new timeout.
	inactiveIntervalId = setTimeout(() => {
		focusState = FocusState.LOST;
	}, parseInt(config.get('inactivity-timeout') ?? '300000')); // default: 5 minutes
}

export async function activate(context: ExtensionContext): Promise<void> {
	// Initialize the extension
	bufferState = BufferState.IDLING;
	focusState = FocusState.GAINED;

	// Read config values
	let autoEnabled = config.get('rpc-auto');
	let rpcRefreshInterval: number = parseInt(config.get('rpc-refresh-interval') ?? '15000');

	// Register event handlers.
	context.subscriptions.push(
		commands.registerCommand('discord.connect', async () => {
			try {
				window.showMessage('[Discord] Connecting...');
				await client.connect();

				await updateClientState();
				updateIntervalId = setInterval(updateClientState, rpcRefreshInterval);

				window.showMessage(`[Discord] Connected! Welcome, ${client.username}!`);
			} catch (err) {
				window.showErrorMessage(`[Discord] Failed to connect.`);
				window.showDialog({
					title: 'Discord Presence',
					content: 'An error has occurred:\n' + err.toString(),
				});
			}
		}),

		commands.registerCommand('discord.disconnect', async () => {
			window.showMessage('[Discord] Disconnecting...');
			deactivate();
			window.showMessage('[Discord] Disconnected.');
		}),

		workspace.registerAutocmd({
			event: 'InsertEnter',
			request: true,
			callback: async () => {
				if (!workspaceOpenTime) workspaceOpenTime = new Date();
				bufferState = BufferState.EDITING;

				await updateClientState();
			},
		}),

		workspace.registerAutocmd({
			event: 'InsertLeave',
			request: true,
			callback: async () => {
				bufferState = BufferState.VIEWING;

				await updateClientState();
			},
		}),

		workspace.registerAutocmd({
			event: 'BufEnter',
			request: true,
			callback: async () => {
				if (!workspaceOpenTime) workspaceOpenTime = new Date();
				bufferState = BufferState.VIEWING;

				await updateClientState();
			},
		}),

		workspace.registerAutocmd({
			event: 'BufLeave',
			request: true,
			callback: () => {
				bufferState = BufferState.IDLING;
			},
		}),

		workspace.registerAutocmd({
			event: 'CursorMoved',
			request: true,
			callback: async () => {
				await updateInactiveDetector();
			},
		}),

		workspace.registerAutocmd({
			event: 'CursorMovedI',
			request: true,
			callback: async () => {
				await updateInactiveDetector();
			},
		})
	);

	client.setOnDisconnect(async (wasUnexpected: boolean) => {
		clearInterval(updateIntervalId);
		clearInterval(inactiveIntervalId);

		if (wasUnexpected) {
			// Show message and attempt to reconnect.
			window.showErrorMessage('[Discord] Connection lost! Attempting to reconnect...');

			let connected = false;
			let attempt = 0;
			let maxAttempts = 30;

			while (!connected) {
				try {
					await client.connect();

					await updateClientState();
					updateIntervalId = setInterval(updateClientState, rpcRefreshInterval);

					window.showMessage(`[Discord] Reconnected! Welcome, ${client.username}!`);
					connected = true;
				} catch (error) {
					window.showErrorMessage(
						`[Discord] Reconnecting... ${attempt}s/${maxAttempts}s...`
					);

					await new Promise((resolve) => setTimeout(resolve, 1000));

					if (attempt >= maxAttempts) break;
				}

				attempt++;
			}
		}
	});

	// Check if the project has a .nodiscord file.
	let projectRoot = workspace.workspaceFolder?.uri?.replace('file://', '');
	// window.showMessage(projectRoot + '/.nodiscord');

	//let noDiscordFile = !!projectRoot ? await workspace.readFile(projectRoot + '/.nodiscord') : null;
	//let disableForProject = noDiscordFile !== null;

	let disableForProject = await new Promise((resolve) => {
		// Check the file exists.
		fs.access(projectRoot + '/.nodiscord', fs.constants.F_OK, (err) => {
			if (err) return resolve(false);
			return resolve(true);
		});
	});

	if (disableForProject) {
		window.showInformationMessage('[Discord] Disabled for this workspace because of .nodiscord file.');
	}

	// Initialize now if set to auto-connect.
	if (autoEnabled && !disableForProject) {
		try {
			await client.connect();

			await updateClientState();
			updateIntervalId = setInterval(updateClientState, rpcRefreshInterval);

			window.showMessage(`[Discord] Connected! Welcome ${client.username}!`);
		} catch (error) {
			window.showErrorMessage('Failed to connect to Discord!');
			/*window.showDialog({
				title: 'Error',
				content: error.toString(),
			});*/
		}
	}
}

export async function deactivate(): Promise<void> {
	clearInterval(updateIntervalId);
	clearInterval(inactiveIntervalId);
	client.disconnect();
}
