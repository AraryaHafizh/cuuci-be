import { PrismaService } from "../prisma/prisma.service";
import { RedisService } from "../redis/redis.service";

export class ReportService {
    private prisma: PrismaService;
    private redisService: RedisService;

    constructor () {
        this.prisma = new PrismaService();
        this.redisService = new RedisService();
    }

    getReport = async () => {}
}