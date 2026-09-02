import { Module } from '@nestjs/common';
import { ItemService } from './item.service';
import { ItemRepository } from './item.repository';
import { Item, ItemSchema } from 'src/schema/domain/event/item.schema';
import { MongooseModule } from '@nestjs/mongoose';

@Module({
    imports: [
        MongooseModule.forFeature([{ name: Item.name, schema: ItemSchema }]),
    ],
    providers: [ItemService, ItemRepository],
    exports: [ItemService],
})
export class ItemModule {}
