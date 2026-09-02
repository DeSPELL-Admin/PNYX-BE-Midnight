import { Connection, Model } from 'mongoose';
import { startTestMongo, TestMongo } from 'src/test-utils/test-mongo';
import { registerModel } from 'src/test-utils/register-model';
import {
    Category,
    CategoryDocument,
    CategorySchema,
} from 'src/schema/domain/category.schema';
import { CategoryRepository } from './category.repository';

describe('CategoryRepository (integration, real replica-set Mongo)', () => {
    let mem: TestMongo;
    let connection: Connection;
    let model: Model<CategoryDocument>;
    let repo: CategoryRepository;

    beforeAll(async () => {
        mem = await startTestMongo({ dbName: 'pnyx_test_category' });
        connection = mem.connection;
        model = registerModel<CategoryDocument>(
            connection,
            Category.name,
            CategorySchema,
        );
        await model.syncIndexes();
        repo = new CategoryRepository(model);
    }, 60000);

    afterAll(async () => {
        await mem.stop();
    });

    beforeEach(async () => {
        await model.deleteMany({});
    });

    it('returns categories sorted ascending without _id', async () => {
        await model.create([
            { category: 'zeta' },
            { category: 'alpha' },
            { category: 'mid' },
        ]);
        expect(await repo.getCategories(1, 10)).toEqual([
            { category: 'alpha' },
            { category: 'mid' },
            { category: 'zeta' },
        ]);
    });

    it('applies skip and limit', async () => {
        await model.create([
            { category: 'alpha' },
            { category: 'mid' },
            { category: 'zeta' },
        ]);
        expect(await repo.getCategories(2, 2)).toEqual([{ category: 'zeta' }]);
        expect(await repo.getCategories(3, 2)).toEqual([]);
    });

    it('returns an empty array and zero count when empty', async () => {
        expect(await repo.getCategories(1, 10)).toEqual([]);
        expect(await repo.countCategories()).toBe(0);
    });

    it('counts all documents', async () => {
        await model.create([
            { category: 'a' },
            { category: 'b' },
            { category: 'c' },
        ]);
        expect(await repo.countCategories()).toBe(3);
    });

    it('rejects a duplicate category (unique index)', async () => {
        await model.create({ category: 'alpha' });
        await expect(model.create({ category: 'alpha' })).rejects.toMatchObject(
            {
                code: 11000,
            },
        );
    });

    it('paginates a large data set correctly', async () => {
        const docs = Array.from({ length: 1500 }, (_, i) => ({
            category: `cat-${String(i).padStart(4, '0')}`,
        }));
        await model.insertMany(docs);

        const page = await repo.getCategories(50, 20);
        expect(page).toHaveLength(20);
        expect(page[0]).toEqual({ category: 'cat-0980' });
        expect(page[19]).toEqual({ category: 'cat-0999' });
        expect(await repo.countCategories()).toBe(1500);
    }, 30000);
});
