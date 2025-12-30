import { ApiError } from "../../utils/api-error";
import { PrismaService } from "../prisma/prisma.service";
import { createDTO } from "./dto/create.dto";
import { updateDTO } from "./dto/edit.dto";

export class AddressService {
  private prisma: PrismaService;

  constructor() {
    this.prisma = new PrismaService();
  }

  private async validateAddressOwnership(addressId: string, userId: string) {
    const address = await this.prisma.address.findUnique({
      where: { id: addressId },
    });

    if (!address) throw new ApiError("Address not found", 404);

    if (address.userId !== userId) {
      throw new ApiError("Forbidden access to this address", 403);
    }

    return address;
  }

  getAddresses = async (userId: string) => {
    const addresses = await this.prisma.address.findMany({
      where: {
        userId,
        isDeleted: false,
      },
      orderBy: { createdAt: "asc" },
    });

    return {
      message: "Address fetched successfully",
      data: addresses,
    };
  };

  createAddress = async (data: createDTO, userId: string) => {
    if (data.isPrimary) {
      await this.prisma.address.updateMany({
        where: { userId },
        data: { isPrimary: false },
      });
    }

    const address = await this.prisma.address.create({
      data: {
        ...data,
        userId,
      },
    });

    return {
      message: "Address created successfully",
      data: address,
    };
  };

  updateAddress = async (addressId: string, userId: string, dto: updateDTO) => {
    await this.validateAddressOwnership(addressId, userId);

    if (dto.isPrimary) {
      await this.prisma.address.updateMany({
        where: { userId },
        data: { isPrimary: false },
      });
    }

    const updated = await this.prisma.address.update({
      where: { id: addressId },
      data: dto,
    });

    return {
      message: "Address updated successfully",
      data: updated,
    };
  };

  deleteAddress = async (addressId: string, userId: string) => {
    const address = await this.validateAddressOwnership(addressId, userId);

    const addresses = await this.prisma.address.findMany({
      where: {
        userId,
        isDeleted: false,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    if (addresses.length === 1) {
      throw new ApiError("You must have at least one address", 400);
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.address.update({
        where: { id: addressId },
        data: {
          isDeleted: true,
          isPrimary: false,
        },
      });

      if (address.isPrimary) {
        const newPrimary = addresses.find((a) => a.id !== addressId);

        if (newPrimary) {
          await tx.address.update({
            where: { id: newPrimary.id },
            data: { isPrimary: true },
          });
        }
      }
    });

    return {
      message: "Address deleted",
    };
  };

  setPrimaryAddress = async (addressId: string, userId: string) => {
    await this.validateAddressOwnership(addressId, userId);

    await this.prisma.$transaction(async (tx) => {
      await tx.address.updateMany({
        where: {
          userId,
          isPrimary: true,
        },
        data: {
          isPrimary: false,
        },
      });

      await tx.address.update({
        where: { id: addressId },
        data: {
          isPrimary: true,
        },
      });
    });

    return {
      message: "Address set as primary",
    };
  };
}
