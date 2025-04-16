import { invoke } from '@tauri-apps/api/core';

import { ModItem } from '@/lib/store/mods';

type PackDBField = {
	ca_order: number;
	default_value: any;
	description: string;
	enum_values: any;
	field_type: string;
	filename_relative_path: string | null;
	is_bitwise: number;
	is_filename: boolean;
	is_key: boolean;
	is_part_of_colour: any;
	is_reference: any;
	lookup: any;
	name: string;
};

type PackDBRow = {
	definition: {
		fields: PackDBField[];
		localised_fields: PackDBField[];
		localised_key_order: number[];
		version: number;
	};
	definition_patch: {
		[key: string]: any;
	};
	table_name: string;
	table_data: {
		[key: string]: any;
	}[];
};

export async function parseRawPackDB(app_id: number, mod: ModItem) {
	let modDbParsed: any = {};
	const db_data_raw: { [key: string]: PackDBRow } = await invoke(
		'pack_db_data',
		{
			app_id,
			pack_file_path: mod.mod_file_path,
		},
	);

	modDbParsed.title = mod.title;
	modDbParsed.mod_file = mod.mod_file;
	modDbParsed.mod_file_path = mod.mod_file_path;
	modDbParsed.db = {};

	const dbTablePaths = Object.keys(db_data_raw);

	for (let dbi = 0; dbi < dbTablePaths.length; dbi++) {
		const rawPath = dbTablePaths[dbi];
		const db_path_clean = rawPath.substring(3);
		const db_path_split = db_path_clean.split('/');

		const definition = db_data_raw[rawPath].definition;
		definition.fields.sort((a, b) => a.ca_order - b.ca_order);

		const parsedRows = db_data_raw[rawPath].table_data.map(rowArray => {
			let rowObj: any = {};
			for (let fi = 0; fi < definition.fields.length; fi++) {
				const field = definition.fields[fi];
				rowObj[field.name] = Object.values(rowArray[fi])[0];
			}
			return rowObj;
		});

		let current = modDbParsed.db;
		for (let i = 0; i < db_path_split.length; i++) {
			const part = db_path_split[i];

			if (i === db_path_split.length - 1) {
				current[part] = parsedRows;
			} else {
				if (!current[part]) current[part] = {};
				current = current[part];
			}
		}
	}
}
