import { asyncTest, clearDatabase, createUserAndSession } from '../testUtils';
import UserController from '../../app/controllers/UserController';
import { File, Permission, ItemType, User } from '../../app/db';
import UserModel from '../../app/models/UserModel';
import FileModel from '../../app/models/FileModel';
import PermissionModel from '../../app/models/PermissionModel';

describe('UserController', function() {

	beforeEach(async (done) => {
		await clearDatabase();
		done();
	});

	it('should create a new user along with his root file', asyncTest(async function() {
		const { session } = await createUserAndSession(true);

		const controller = new UserController();
		const permissionModel = new PermissionModel();

		const newUser = await controller.createUser(session.id, { email: 'test@example.com', password: '123456' });

		expect(!!newUser).toBe(true);
		expect(!!newUser.id).toBe(true);
		expect(!!newUser.is_admin).toBe(false);
		expect(!!newUser.email).toBe(true);
		expect(!newUser.password).toBe(true);

		const userModel = new UserModel({ userId: newUser.id });
		const userFromModel:User = await userModel.load(newUser.id);

		expect(!!userFromModel.password).toBe(true);
		expect(userFromModel.password === '123456').toBe(false); // Password has been hashed

		const fileModel = new FileModel({ userId: newUser.id });
		const rootFile:File = await fileModel.userRootFile();

		expect(!!rootFile).toBe(true);
		expect(!!rootFile.id).toBe(true);

		const permissions:Array<Permission> = await permissionModel.filePermissions(rootFile.id);

		expect(permissions.length).toBe(1);
		expect(permissions[0].user_id).toBe(newUser.id);
		expect(permissions[0].item_type).toBe(ItemType.File);
		expect(permissions[0].item_id).toBe(rootFile.id);
		expect(permissions[0].is_owner).toBe(1);
		expect(permissions[0].can_read).toBe(1);
		expect(permissions[0].can_write).toBe(1);
	}));

	it('should not create anything, neither user, root file nor permissions, if user creation fail', asyncTest(async function() {
		const { user, session } = await createUserAndSession(true);

		const controller = new UserController();
		const fileModel = new FileModel({ userId: user.id });
		const permissionModel = new PermissionModel();
		const userModel = new UserModel({ userId: user.id });

		await controller.createUser(session.id, { email: 'test@example.com', password: '123456' });

		const beforeFileCount = (await fileModel.all<File[]>()).length;
		const beforeUserCount = (await userModel.all<File[]>()).length;
		const beforePermissionCount = (await permissionModel.all<File[]>()).length;

		let hasThrown = false;
		try {
			await controller.createUser(session.id, { email: 'test@example.com', password: '123456' });
		} catch (error) {
			hasThrown = true;
		}

		expect(hasThrown).toBe(true);

		const afterFileCount = (await fileModel.all<File[]>()).length;
		const afterUserCount = (await userModel.all<File[]>()).length;
		const afterPermissionCount = (await permissionModel.all<File[]>()).length;

		expect(beforeFileCount).toBe(afterFileCount);
		expect(beforeUserCount).toBe(afterUserCount);
		expect(beforePermissionCount).toBe(afterPermissionCount);
	}));

});
