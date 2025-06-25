import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}
  async markOrderAsProcessing(orderId: number) {
    const findOrder = await this.prisma.order.findUnique({
      where: { id: orderId },
    });
    if (!findOrder)
      throw new NotFoundException('order with this is is not defined');
    await this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'PROCESSING',
      },
    });
    return { message: 'Order PROCESSING' };
  }
  async markOrderAsShipped(orderId: number) {
    const findOrder = await this.prisma.order.findUnique({
      where: { id: orderId },
    });
    if (!findOrder)
      throw new NotFoundException('order with this is is not defined');
    if (findOrder.status !== 'PROCESSING')
      throw new BadRequestException(
        'Orders which status is PROCESSING can be changed to SHIPPED',
      );
    await this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'SHIPPED',
      },
    });
    return { message: 'Order SHIPPED' };
  }
  async markOrderAsDelivered(orderId: number) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException('order with this is is not defined');
    }

    if (order.status !== 'SHIPPED') {
      throw new BadRequestException(
        'Orders which status is SHIPPED can be changed to DELIVERED',
      );
    }

    await this.prisma.order.update({
      where: { id: orderId },
      data: { status: 'DELIVERED' },
    });

    return { message: 'Order DELIVERED' };
  }
  async weeklyIncome() {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const income = await this.prisma.order.aggregate({
      _sum: {
        total: true,
      },
      where: {
        status: 'DELIVERED',
        createdAt: {
          gte: oneWeekAgo,
        },
      },
    });
    return { message: `week income:${income._sum.total || 0} $` }; 
  }
}
