import { dbWrapper } from '@/lib/db';
import type { ModItem } from '@/lib/store/mods';
import { ModOrderModel, type ModOrderItem } from '@/lib/store/mod_order';
import {
	ModActivationModel,
	type ModActivationItem,
} from '@/lib/store/mod_activation';
import type { ModMetaItem } from '@/lib/store/mod_meta';
import type { ModSeparatorItem } from '@/lib/store/mod_separator';

export type Profile = {
	id: number;
	app_id: number;
	name: string;
	is_active: boolean;
};

export type ProfileExportData = {
	app_id: number;
	name: string;
	mods: ModItem[];
	mod_order: ModOrderItem[];
	mod_activation: ModActivationItem[];
	mod_meta: ModMetaItem[];
	mod_separators: ModSeparatorItem[];
};

export class ProfileModel {
	public constructor(public props: Profile) {}

	get id(): number {
		return this.props.id;
	}

	get app_id(): number {
		return this.props.app_id;
	}

	set app_id(value: number) {
		this.props.app_id = value;
	}

	get name(): string {
		return this.props.name;
	}

	set name(value: string) {
		this.props.name = value;
	}

	get is_active(): boolean {
		return this.props.is_active;
	}

	public static async all(app_id: number): Promise<ProfileModel[]> {
		const result: any = await dbWrapper.db.select(
			`SELECT * FROM profiles WHERE app_id = ?`,
			[app_id],
		);
		return result.map(
			(r: {
				id: number;
				app_id: number;
				name: string;
				is_active: boolean;
			}) => new ProfileModel(r),
		);
	}

	public static async retrieve(
		id: number,
	): Promise<ProfileModel | undefined> {
		const result: any = await dbWrapper.db.select(
			`SELECT * FROM profiles WHERE is_active = ?`,
			[id],
		);

		if (result && result[0]) {
			return new ProfileModel(result[0]);
		}
	}

	public static async currentProfile(app_id: number): Promise<ProfileModel> {
		const result: any = await dbWrapper.db.select(
			'SELECT * FROM profiles WHERE is_active = 1 AND app_id = ?',
			[app_id],
		);

		if (result && result[0]) {
			return new ProfileModel(result[0]);
		} else {
			const profiles: any[] = await dbWrapper.db.select(
				'SELECT * FROM profiles WHERE app_id = ?',
				[app_id],
			);
			if (profiles.length > 0) {
				const profileMod = new ProfileModel(profiles[0]);
				await profileMod.setActive();
				return profileMod;
			} else {
				const defaultProfile = new ProfileModel({
					id: null as any,
					app_id,
					name: 'Default',
					is_active: true,
				});
				await defaultProfile.save();
				return defaultProfile;
			}
		}
	}

	public async save(): Promise<boolean> {
		if (this.name.length === 0) {
			throw new Error('Name cannot be empty');
		}

		if (this.id) {
			const result = await dbWrapper.db.execute(
				`UPDATE profiles SET name = ? WHERE id = ?`,
				[this.name, this.id],
			);

			if (result.rowsAffected > 0) {
				return true;
			} else {
				console.error(result);
				throw new Error('Failed to save profile.');
			}
		} else {
			if (!this.app_id) {
				throw new Error('App ID is missing.');
			}
			const result = await dbWrapper.db.execute(
				`INSERT INTO profiles (app_id, name) VALUES (?, ?)`,
				[this.app_id, this.name],
			);

			if (result.lastInsertId) {
				this.props.id = result.lastInsertId;
				return true;
			} else {
				throw new Error('Error while inserting the record');
			}
		}
	}

	public async setActive(): Promise<boolean> {
		if (this.id) {
			await dbWrapper.db.execute(
				'UPDATE profiles SET is_active = 0 WHERE app_id = ?',
				[this.props.app_id],
			);
			const result = await dbWrapper.db.execute(
				`UPDATE profiles SET is_active = 1 WHERE id = ?`,
				[this.id],
			);

			if (result.rowsAffected > 0) {
				return true;
			} else {
				console.error(result);
				throw new Error('Failed to set active for current profile.');
			}
		}

		return false;
	}

	public async delete(): Promise<boolean> {
		if (!this.props.id) {
			throw new Error('ID is required to delete a profile');
		}

		const profiles = await ProfileModel.all(this.props.app_id);
		let nextInLine;
		for (let pi = 0; pi < profiles.length; pi++) {
			if (profiles[pi].id !== this.props.id) {
				nextInLine = profiles[pi];
				break;
			}
		}
		if (nextInLine) {
			await nextInLine.setActive();
		} else {
			throw new Error('Could not find any available profile to switch.');
		}

		const modOrder = await ModOrderModel.retrieve(this.props.id);
		await modOrder?.delete();
		const modActivation = await ModActivationModel.retrieve(this.props.id);
		await modActivation?.delete();

		const result: any = await dbWrapper.db.execute(
			`DELETE FROM profiles WHERE id = ?`,
			[this.props.id],
		);

		if (result.rowsAffected > 0) {
			return true;
		} else {
			console.error(result);
			throw new Error('Failed to delete profile record.');
		}
	}
}
