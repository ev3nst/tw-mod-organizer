import { create } from 'zustand';

import { dbWrapper } from '@/lib/db';
import { profileStore } from '@/lib/store/profile';
import { debounceCallback } from '@/lib/utils';

export type ModGenericProps<T> = {
	id: number;
	profile_id: number;
	app_id: number;
	data: T[];
};

export abstract class ModGenericModel<T extends ModGenericProps<D>, D> {
	constructor(public props: T) {}

	protected abstract getTableName(): string;

	private jsonGetter(prop: D[]) {
		if (typeof prop !== 'string') return prop;

		try {
			return JSON.parse(prop);
		} catch (_e) {
			return prop;
		}
	}

	public static async retrieve<
		T extends ModGenericProps<D>,
		M extends ModGenericModel<T, D>,
		D,
	>(
		this: new (props: T) => M,
		profile_id?: number,
		app_id?: number,
	): Promise<M | undefined> {
		const tempInstance = new this({} as T);
		const tableName = tempInstance.getTableName();

		let result: any;
		if (typeof profile_id === 'number') {
			const query = `SELECT * FROM ${tableName} WHERE profile_id = ?`;
			result = await dbWrapper.db.select(query, [profile_id]);
		} else {
			if (typeof app_id !== 'number') {
				throw new Error(
					'app_id is required when profile_id is left undefined',
				);
			}

			const query = `SELECT * FROM ${tableName} WHERE app_id = ?`;
			result = await dbWrapper.db.select(query, [app_id]);
		}

		if (result && result[0]) {
			const row = result[0];
			if (typeof row.data === 'string') {
				try {
					row.data = JSON.parse(row.data);
				} catch (_e) {}
			}
			return new this(row);
		}
	}

	public async save(): Promise<boolean> {
		if (!this.props.app_id) {
			throw new Error('App ID is required');
		}

		const tableName = this.getTableName();
		let result: any = {};

		if (this.props.id) {
			result = await dbWrapper.db.execute(
				`UPDATE ${tableName} SET data = ? WHERE id = ?`,
				[this.props.data, this.props.id],
			);
		} else {
			if (this.props.profile_id) {
				result = await dbWrapper.db.execute(
					`INSERT INTO ${tableName} (profile_id, app_id, data) VALUES (?, ?, ?)`,
					[this.props.profile_id, this.props.app_id, this.props.data],
				);
			} else {
				result = await dbWrapper.db.execute(
					`INSERT INTO ${tableName} (app_id, data) VALUES (?, ?)`,
					[this.props.app_id, this.props.data],
				);
			}
		}

		if (result.rowsAffected > 0) {
			return true;
		} else {
			console.error(result);
			throw new Error(`Failed to save ${tableName} record.`);
		}
	}

	public async delete(): Promise<boolean> {
		const tableName = this.getTableName();
		if (!this.props.id) {
			throw new Error(`ID is required to delete a ${tableName}`);
		}

		const result: any = await dbWrapper.db.execute(
			`DELETE FROM ${tableName} WHERE id = ?`,
			[this.props.id],
		);

		if (result.rowsAffected > 0) {
			return true;
		} else {
			console.error(result);
			throw new Error(`Failed to delete ${tableName} record.`);
		}
	}

	get id(): number {
		return this.props.id;
	}

	get profile_id(): number | undefined {
		return this.props.profile_id;
	}

	get app_id(): number {
		return this.props.app_id;
	}

	get data(): D[] | null {
		return this.jsonGetter(this.props.data);
	}

	set data(value: D[]) {
		this.props.data = value;
	}
}

export type ModelConstructor<
	T extends ModGenericProps<D>,
	M extends ModGenericModel<T, D>,
	D,
> = {
	new (props: T): M;
	retrieve(profile_id?: number): Promise<M | undefined>;
};

type StoreGeneratorOptions<
	T extends ModGenericProps<D>,
	M extends ModGenericModel<T, D>,
	D = any,
> = {
	model: ModelConstructor<T, M, D>;
	initialState: D[];
};

export const createStore = <
	T extends ModGenericProps<D>,
	M extends ModGenericModel<T, D>,
	D = any,
	E = {},
>({
	model,
	initialState,
	extend,
}: StoreGeneratorOptions<T, M, D> & {
	extend?: (
		set: (state: any) => void,
		get: () => { data: D[]; setData: (data: D[]) => void } & E,
		helpers: { syncData: (dataToSync: D[]) => Promise<void> },
	) => E;
}) => {
	const createSyncData = () => {
		return async (dataToSync: D[]) => {
			const { profile } = profileStore.getState();
			const instance = await model.retrieve(profile.id);
			if (instance) {
				instance.data = dataToSync;
				await instance.save();
			}
		};
	};

	const syncData = createSyncData();
	return create<{ data: D[]; setData: (data: D[]) => void } & E>(
		(set, get) => {
			const base = {
				data: initialState,
				setData: (data: D[]) => {
					set({ data } as any);
					debounceCallback(() => syncData(data));
				},
			};

			const extensions = extend
				? extend(
						set as (state: any) => void,
						get as () => {
							data: D[];
							setData: (data: D[]) => void;
						} & E,
						{ syncData },
					)
				: ({} as E);

			return {
				...base,
				...extensions,
			};
		},
	);
};
