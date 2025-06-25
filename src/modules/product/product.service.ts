import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductService {
  constructor(private prisma: PrismaService) {}
  async createProduct(createProductDto: CreateProductDto) {
    const findProduct = await this.prisma.product.findUnique({
      where: { name: createProductDto.name },
    });
    if (findProduct)
      throw new ConflictException("Product already exist");
    const findCategory = await this.prisma.category.findUnique({
      where: { id: createProductDto.categoryId },
    });
    if (!findCategory)
      throw new NotFoundException('Product with this id is not defined');
    const newProduct = await this.prisma.product.create({
      data: createProductDto,
    });
    return {
      message: 'Mahsulot muvafaqiyatli yaratildi',
      newProduct,
    };
  }
  async searchProduct(query: string) {
    return await this.prisma.$queryRaw`
    SELECT * FROM products 
    WHERE name ILIKE '%' || ${query}|| '%'
    ORDER BY sold DESC
    `;
  }

  async addProduct(updateProductDto: UpdateProductDto) {
    const findProduct = await this.prisma.product.findUnique({
      where: { id: updateProductDto.product_id },
    });
    if (!findProduct)
      throw new NotFoundException('Product with this id is not defined');
    await this.prisma.product.update({
      where: { id: updateProductDto.product_id },
      data: {
        stock: {
          increment: updateProductDto.quantity,
        },
      },
    });
    return {
      message: `to ${findProduct.name} | ${updateProductDto.quantity} quantity product added`,
    };
  }
}
