import { ForbiddenException, Injectable } from '@nestjs/common';
import { CreateOrderDto } from './dto/create-order.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { userPayload } from 'src/common/interfaces/express-user.interface';

@Injectable()
export class OrderService {
  constructor(private prisma: PrismaService) {}
  async createOrder(user: userPayload, dto: CreateOrderDto) {
    const { items } = dto;
    return await this.prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          userId: user.id,
          status: 'PENDING',
          total: 0,
        },
      });
      let totalPrice = 0;
      for (const item of items) {
        const product = await tx.product.findUnique({
          where: { id: item.productId },
        });
        if (!product)
          throw new ForbiddenException(
            `${item.productId} product with this id not found`,
          );
        if (product.stock < item.quantity)
          throw new ForbiddenException(
            `have not enough amount: from ${product.name} you can maximum buy ${product.stock}`,
          );
        const itemPrice = product.price * item.quantity;
        totalPrice += itemPrice;
        await tx.orderItem.create({
          data: {
            orderId: order.id,
            productId: product.id,
            quantity: item.quantity,
            price: product.price,
          },
        });
        await tx.product.update({
          where: { id: product.id },
          data: {
            stock: { decrement: item.quantity },
            sold: { increment: item.quantity },
          },
        });
      }
      await tx.order.update({
        where: { id: order.id },
        data: { total: totalPrice },
      });
      return {
        orderId: order.id,
        total: totalPrice,
        message: 'Order created success',
      };
    });
  }
  async myPendingProducts(user: userPayload) {
    return await this.prisma.order.findMany({
      where: { userId: user.id, status: 'PENDING' },
      include: {
        orderItems: {
          include: {
            product: {
              select: {
                name: true,
                price: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }
  async myOrders(user: userPayload) {
    return await this.prisma.order.findMany({
      where: { userId: user.id },
      include: {
        orderItems: {
          include: {
            product: {
              select: {
                name: true,
                price: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
  async myOrderById(user: userPayload, orderId: number) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, userId: user.id },
      include: {
        orderItems: {
          include: {
            product: {
              select: {
                name: true,
                price: true,
              },
            },
          },
        },
      },
    });
    if (!order) throw new ForbiddenException('order not found');
    return order;
  }
  async cancelMyOrder(user: userPayload, orderId: number) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, userId: user.id },
      include: { orderItems: true },
    });
    if (!order) throw new ForbiddenException('order not found');
    if (order.status !== 'PENDING')
      throw new ForbiddenException(
        'order only with status PENDING can be canceled',
      );
    return this.prisma.$transaction(async (tx) => {
      for (const item of order.orderItems) {
        await tx.product.update({
          where: { id: item.productId },
          data: {
            stock: { increment: item.quantity },
            sold: { decrement: item.quantity },
          },
        });
      }
      await tx.order.update({
        where: { id: order.id },
        data: { status: 'CANCELED' },
      });
      return { message: 'order canceled' };
    });
  }
  async myOrdersStats(user: userPayload) {
    const orders = await this.prisma.order.findMany({
      where: { userId: user.id },
      select: { total: true },
    });
    if (orders.length === 0) {
      throw new ForbiddenException('you have not order');
    }

    const totalOrders = orders.length;
    const totalSpent = orders.reduce((sum, order) => sum + order.total, 0);
    return {
      message: 'statistic of order',
      totalOrders,
      totalSpent,
    };
  }
  async createOrderByCart(user: userPayload) {
    return await this.prisma.$transaction(async (tx) => {
      const cartItems = await tx.cart.findMany({
        where: { userId: user.id },
        include: {
          product: true,
        },
      });
      if (cartItems.length === 0) throw new ForbiddenException("Card is empty");
      let total = 0;
      const order = await tx.order.create({
        data: {
          userId: user.id,
          status: 'PENDING',
          total: 0,
        },
      });
      for (const item of cartItems) {
        if (item.product.stock < item.quantity) {
          throw new ForbiddenException(
            `have not enough amount: from ${item.product.name} (available:${item.product.stock})`,
          );
        }
        total += item.quantity * item.product.price;
        await tx.orderItem.create({
          data: {
            orderId: order.id,
            productId: item.productId,
            quantity: item.quantity,
            price: item.product.price,
          },
        });
        await tx.product.update({
          where: { id: item.productId },
          data: {
            stock: { decrement: item.quantity },
            sold: { increment: item.quantity },
          },
        });
        await tx.cart.deleteMany({ where: { userId: user.id } });
        await tx.order.update({ where: { id: order.id }, data: { total } });
      }
      return {
        message: 'Order created success',
        orderId: order.id,
        total,
      };
    });
  }
}
