import { Module } from '@nestjs/common';
import { CategoryService } from './category.service';
import { CategoryController } from './category.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Category, CategorySchema } from 'src/schema/domain/category.schema';
import { CategoryRepository } from './category.repository';
import { TournamentModule } from '../tournament/tournament.module';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: Category.name, schema: CategorySchema },
        ]),
        TournamentModule,
    ],
    providers: [CategoryService, CategoryRepository],
    controllers: [CategoryController],
})
export class CategoryModule {}
