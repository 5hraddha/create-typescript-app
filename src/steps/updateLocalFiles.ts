import replaceInFile from "replace-in-file";

import { readFileSafeAsJson } from "../shared/readFileSafeAsJson.js";
import { Options } from "../shared/types.js";

interface ExistingPackageData {
	description?: string;
	version?: string;
}

export async function updateLocalFiles(options: Options) {
	const existingPackage = ((await readFileSafeAsJson("./package.json")) ??
		{}) as ExistingPackageData;

	const replacements = [
		[/Create TypeScript App/g, options.title],
		[/JoshuaKGoldberg(?!\/console-fail-test)/g, options.owner],
		[/create-typescript-app/g, options.repository],
		[/\/\*\n.+\*\/\n\n/gs, ``, ".eslintrc.cjs"],
		[/"author": ".+"/g, `"author": "${options.author}"`, "./package.json"],
		...(options.mode === "migrate"
			? []
			: [[/"bin": ".+\n/g, ``, "./package.json"]]),
		[/"test:create": ".+\n/g, ``, "./package.json"],
		[/"test:initialize": ".*/g, ``, "./package.json"],
		[/"initialize": ".*/g, ``, "./package.json"],
		[/"test:migrate": ".+\n/g, ``, "./package.json"],
		[/## Getting Started.*## Development/gs, `## Development`, "./README.md"],
		[/\n## Setup Scripts.*$/gs, "", "./.github/DEVELOPMENT.md"],
		[`\t\t"src/initialize/index.ts",\n`, ``, "./knip.jsonc"],
		[`\t\t"src/migrate/index.ts",\n`, ``, "./knip.jsonc"],
		[
			`["src/index.ts!", "script/initialize*.js"]`,
			`"src/index.ts!"`,
			"./knip.jsonc",
		],
		[`["src/**/*.ts!", "script/**/*.js"]`, `"src/**/*.ts!"`, "./knip.jsonc"],
		// Edge case: migration scripts will rewrite README.md attribution
		[
			`> 💙 This package is based on [@${options.owner}](https://github.com/${options.owner})'s [${options.repository}](https://github.com/JoshuaKGoldberg/${options.repository}).`,
			`> 💙 This package is based on [@JoshuaKGoldberg](https://github.com/JoshuaKGoldberg)'s [create-typescript-app](https://github.com/JoshuaKGoldberg/create-typescript-app).`,
			"./README.md",
		],
	];

	if (existingPackage.description) {
		replacements.push([existingPackage.description, options.description]);
	}

	if (options.mode === "initialize" && existingPackage.version) {
		replacements.push([
			new RegExp(`"version": "${existingPackage.version}"`, "g"),
			`"version": "0.0.0"`,
			"./package.json",
		]);
	}

	for (const [from, to, files = ["./.github/**/*", "./*.*"]] of replacements) {
		try {
			// @ts-expect-error -- https://github.com/microsoft/TypeScript/issues/54342
			await replaceInFile({
				allowEmptyPaths: true,
				files,
				from,
				to,
			});
		} catch (error) {
			throw new Error(
				`Failed to replace ${from.toString()} with ${to} in ${files.toString()}`,
				{
					cause: error,
				},
			);
		}
	}
}
