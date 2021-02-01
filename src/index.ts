import { commands, CompleteResult, ExtensionContext, window, workspace } from 'coc.nvim';

const client: DiscordClient = new DiscordClient(workspace.getConfiguration('rpc'));

export async function activate(context: ExtensionContext): Promise<void> {
  window.showMessage(`coc-discord-presence works!`);

  const { logger } = context;

  context.subscriptions.push(
    commands.registerCommand('coc-discord-presence.Command', async () => {
      window.showMessage(`coc-discord-presence Commands works!`);
    }),

    workspace.registerAutocmd({
      event: 'InsertLeave',
      request: true,
      callback: () => {
        window.showMessage(`registerAutocmd on InsertLeave`);
      },
    })
  );
}

async function getCompletionItems(): Promise<CompleteResult> {
  return {
    items: [
      {
        word: 'TestCompletionItem 1',
        menu: '[coc-discord-presence]',
      },
      {
        word: 'TestCompletionItem 2',
        menu: '[coc-discord-presence]',
      },
    ],
  };
}
