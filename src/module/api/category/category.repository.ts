import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Category, CategoryDocument } from 'src/schema/domain/category.schema';
import { GetCategoriesQueryResult } from './query-result/get-categories.query-result';
import { calculateSkip } from 'src/module/common/util/pagination.util';

@Injectable()
export class CategoryRepository {
    constructor(
        @InjectModel(Category.name)
        private readonly categoryModel: Model<CategoryDocument>,
    ) {}

    async getCategories(
        page: number,
        limit: number,
    ): Promise<GetCategoriesQueryResult[]> {
        const skip = calculateSkip(page, limit);

        return await this.categoryModel
            .find()
            .select('category -_id')
            .sort({ category: 1 })
            .skip(skip)
            .limit(limit)
            .lean()
            .exec();
    }

    async countCategories(): Promise<number> {
        return await this.categoryModel.countDocuments().exec();
    }
}
