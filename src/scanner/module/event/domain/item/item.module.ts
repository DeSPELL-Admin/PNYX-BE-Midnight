import { Module } from '@nestjs/common';
import { ItemRepository } from './item.repository';
import { ItemService } from './item.service';
import { MongooseModule } from '@nestjs/mongoose';
import { Item, ItemSchema } from 'src/schema/domain/event/item.schema';

@Module({
    imports: [
        MongooseModule.forFeature([{ name: Item.name, schema: ItemSchema }]),
    ],
    providers: [ItemService, ItemRepository],
    exports: [ItemService],
})
export class ItemModule {}
