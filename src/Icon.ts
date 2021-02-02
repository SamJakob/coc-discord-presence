const knownIcons = [
	'bash',
	'c',
	'cpp',
	'csharp',
	'css',
	'docker',
	'dot-net',
	'flask',
	'flutter',
	'git',
	'github',
	'gitlab',
	'go',
	'gradle',
	'gulp',
	'handlebars',
	'haskell',
	'html',
	'ionic',
	'java',
	'javascript',
	'jenkins',
	'kotlin',
	'kubernetes',
	'markdown',
	'mongo',
	'nginx',
	'node',
	'npm',
	'objc',
	'php',
	'python',
	'react',
	'redis',
	'ruby',
	'rust',
	'sass',
	'sql',
	'swift',
	'typescript',
	'vagrant',
	'vue',
	'webpack',
	'yarn',
];

const fileNameMap = [
	[/^package\.json$/, 'npm'],	
	[/^yarn\.lock$/, 'yarn']
];

 export function getIcon(language: string, fileName: string, workspace: any): string | undefined {
	if (language === undefined || language === null || language === "")
		return undefined;

	let mappedLangByFilename: any = fileNameMap.find((value) => fileName.match(value[0]));
	if (mappedLangByFilename !== undefined) return mappedLangByFilename[1];

	if (knownIcons.includes(language)) return language;

	return undefined;
}
