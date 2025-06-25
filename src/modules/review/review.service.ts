import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { userPayload } from 'src/common/interfaces/express-user.interface';
import { DeliveryReviewgDto } from './dto/deliver-ratings.dto';

@Injectable()
export class ReviewService {
  constructor(private prisma: PrismaService) {}
  async createReview(dto: CreateReviewDto, user: userPayload) {
    const orderItem = await this.prisma.orderItem.findUnique({
      where: { id: dto.orderItemId },
      include: {
        order: true,
        product: true,
      },
    });
    if (!orderItem) throw new BadRequestException('OrderItem not found');
    if (orderItem.order.userId !== user.id)
      throw new BadRequestException('you have not access to this order');
    if (orderItem.order.status !== 'DELIVERED')
      throw new BadRequestException(
        'you can put review for only products which bought',
      );
    const alreadyReviewed = await this.prisma.review.findFirst({
      where: { userId: user.id, orderItemId: dto.orderItemId },
    });
    if (alreadyReviewed)
      throw new BadRequestException('review already exist');
    const review = await this.prisma.review.create({
      data: {
        userId: user.id,
        productId: orderItem.productId,
        orderItemId: dto.orderItemId,
        content: dto.content,
        rating: dto.rating,
      },
    });

    return {
      message: 'review created success',
      reviewId: review.id,
      name: orderItem.product.name,
      rating: review.rating,
      content: review.content,
    };
  }
  async deliveryRating(dto: DeliveryReviewgDto, user: userPayload) {
    const findOrder = await this.prisma.order.findUnique({
      where: { id: dto.orderId },
    });
    if (!findOrder)
      throw new BadRequestException(
        'order not found',
      );
    const alreadyReviewed = await this.prisma.order.findFirst({
      where: { userId: user.id, id: dto.orderId },
    });
    if (alreadyReviewed)
      throw new BadRequestException(
        'you already gave rating and feedback',
      );
    const ratings = await this.prisma.order.update({
      where: { id: findOrder.id },
      data: {
        deliverRating: dto.deliveryRating,
        deliveryFeedback: dto.deliveryFeedback,
      },
    });
    return {
      message: 'review already created',
      deliveryRating: ratings.deliverRating,
      deliveryFeedback: ratings.deliveryFeedback,
    };
  }
  async deleteReviewById(reviewId: number, user: userPayload) {
    const findReview = await this.prisma.review.findUnique({
      where: { id: reviewId },
    });
    if (!findReview)
      throw new BadRequestException(
        'review with this id is not defined',
      );
    if (findReview?.userId !== user.id)
      throw new BadRequestException('you have not access for this review');
    await this.prisma.review.delete({ where: { id: reviewId } });
    return {
      message: 'review deleted success',
      deleted: findReview,
    };
  }
}
