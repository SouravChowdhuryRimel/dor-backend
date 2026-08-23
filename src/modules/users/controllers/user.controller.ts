import {
  Controller,
  Get,
  Req,
  UseGuards,
  NotFoundException,
  Patch,
  Body,
  UseInterceptors,
  UploadedFiles,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiBody,
  ApiConsumes,
} from '@nestjs/swagger';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import * as fs from 'fs';
import * as argon2 from 'argon2';
import { UpdateProfileDto } from '../dto/update-profile.dto';
import { AccessTokenGuard } from '../../../common/guards/access-token.guard';
import { UsersService } from '../services/users.service';
import { CompanyService } from '../../company/services/company.service';
import { PartyService } from '../../party/services/party.service';
import { DriverService } from '../../driver/services/driver.service';
import { Role } from '../../../common/constants/role.enum';

@ApiTags('User Profile')
@ApiBearerAuth()
@UseGuards(AccessTokenGuard)
@Controller('user')
export class UserController {
  constructor(
    private readonly usersService: UsersService,
    private readonly companyService: CompanyService,
    private readonly partyService: PartyService,
    private readonly driverService: DriverService,
  ) {}

  @Get('profile')
  @ApiOperation({
    summary: 'Get currently logged-in user profile',
    description:
      'Retrieves the complete profile information for the authenticated User, Vendor, Party, or Driver.',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns the full profile details.',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized.',
  })
  @ApiResponse({
    status: 404,
    description: 'User not found.',
  })
  async getProfile(@Req() req: any) {
    const { sub, roles } = req.user;

    if (roles.includes(Role.SUPER_ADMIN) || roles.includes(Role.ADMIN)) {
      const user = await this.usersService.findById(sub);
      if (!user) {
        throw new NotFoundException('User profile not found');
      }

      const category =
        (user as any).adminCategories?.map((ac: any) => ({
          categoryId: ac.category?.categoryId || ac.categoryId,
          categoryName: ac.category?.categoryName || null,
        })) || [];

      return {
        id: user.id,
        phoneNumber: user.phoneNumber,
        ownerName: user.name || null,
        email: user.email || null,
        district: null,
        upozela: null,
        address: null,
        area: null,
        status: user.isActive ? 'ACTIVE' : 'INACTIVE',
        role: roles.includes(Role.SUPER_ADMIN) ? Role.SUPER_ADMIN : Role.ADMIN,
        isVerified: true,
        category,
        company: [],
        driver: [],
        party: [],
      };
    }

    if (roles.includes(Role.VENDOR)) {
      const company = await this.companyService.findOne(sub);
      if (!company) {
        throw new NotFoundException('Company profile not found');
      }

      const category = company.category
        ? [
            {
              categoryId: company.category.categoryId,
              categoryName: company.category.categoryName,
            },
          ]
        : [];

      return {
        id: company.companyId,
        phoneNumber: company.phoneNumber,
        ownerName: company.ownerName,
        email: company.email,
        district: company.district,
        upozela: company.upozela,
        address: company.address,
        area: null,
        status: company.status,
        role: Role.VENDOR,
        isVerified: company.isVerified,
        category,
        company: [
          {
            companyName: company.companyName,
            companyDocument: company.companyDocument,
            companyImage: company.companyImage || null,
          },
        ],
        driver: [],
        party: [],
      };
    }

    if (roles.includes(Role.PARTY)) {
      const party = await this.partyService.findOne(sub);
      if (!party) {
        throw new NotFoundException('Party profile not found');
      }

      const category = party.category
        ? [
            {
              categoryId: party.category.categoryId,
              categoryName: party.category.categoryName,
            },
          ]
        : [];

      return {
        id: party.partyId,
        phoneNumber: party.phoneNumber,
        ownerName: party.partyName,
        email: party.email,
        district: party.district,
        upozela: party.upozela,
        address: party.address,
        area: party.bazzarArea,
        status: party.status,
        role: Role.PARTY,
        isVerified: party.isVerified,
        category,
        company: [],
        driver: [],
        party: [
          {
            businessName: party.businessName,
            description: party.description,
            openingDue: party.openingDue,
            creditLimit: party.creditLimit,
            treadLicense: party.treadLicense || null,
            partyDocument: party.partyDocument,
            profileImage: party.profileImage || null,
          },
        ],
      };
    }

    if (roles.includes(Role.DRIVER)) {
      const driver = await this.driverService.findOne(sub);
      if (!driver) {
        throw new NotFoundException('Driver profile not found');
      }

      const category = driver.category
        ? [
            {
              categoryId: driver.category.categoryId,
              categoryName: driver.category.categoryName,
            },
          ]
        : [];

      return {
        id: driver.driverId,
        phoneNumber: driver.phoneNumber,
        ownerName: driver.driverName,
        email: driver.email,
        district: driver.district,
        upozela: driver.upozela || null,
        address: driver.address,
        area: 'driver only',
        status: 'APPROVED',
        role: Role.DRIVER,
        isVerified: driver.isVerified,
        category,
        company: [],
        driver: [
          {
            truckNumber: driver.truckNumber || null,
            truckType: driver.truckType || null,
            loadCapacity: driver.loadCapacity || null,
            drivingLicenceNumber: driver.drivingLicenceNumber,
            nidNumber: driver.nidNumber,
            driverDocument: driver.driverDocument,
            driverImage: driver.driverImage || null,
          },
        ],
        party: [],
      };
    }

    throw new NotFoundException('Profile role not matched');
  }

  @Get('verified')
  @ApiOperation({
    summary: 'Check the verification status of the authenticated account',
    description:
      'Returns a consistent verification result for user/admin, company, party, and driver roles.',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns the account verification status.',
  })
  async getVerificationStatus(@Req() req: any) {
    const { sub, roles } = req.user;

    if (
      roles.includes(Role.SUPER_ADMIN) ||
      roles.includes(Role.ADMIN) ||
      roles.includes(Role.USER)
    ) {
      const user = await this.usersService.findById(sub);
      if (!user) {
        throw new NotFoundException('User profile not found');
      }

      const isAdmin =
        user.roles.includes(Role.SUPER_ADMIN) ||
        user.roles.includes(Role.ADMIN);

      return {
        id: user.id,
        roles: user.roles,
        isVerified: isAdmin,
        status: user.isActive ? 'ACTIVE' : 'INACTIVE',
      };
    }

    if (roles.includes(Role.VENDOR)) {
      const company = await this.companyService.findOne(sub);
      if (!company) {
        throw new NotFoundException('Company profile not found');
      }

      return {
        id: company.companyId,
        roles,
        isVerified: company.isVerified,
        status: company.status,
      };
    }

    if (roles.includes(Role.PARTY)) {
      const party = await this.partyService.findOne(sub);
      if (!party) {
        throw new NotFoundException('Party profile not found');
      }

      return {
        id: party.partyId,
        roles,
        isVerified: party.isVerified,
        status: party.status,
      };
    }

    if (roles.includes(Role.DRIVER)) {
      const driver = await this.driverService.findOne(sub);
      if (!driver) {
        throw new NotFoundException('Driver profile not found');
      }

      return {
        id: driver.driverId,
        roles,
        isVerified: driver.isVerified,
        status: 'APPROVED',
      };
    }

    throw new NotFoundException('Profile role not matched');
  }

  @Patch('profile')
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'profileImage', maxCount: 1 },
        { name: 'companyImage', maxCount: 1 },
        { name: 'companyDocument', maxCount: 10 },
        { name: 'partyDocument', maxCount: 10 },
        { name: 'treadLicense', maxCount: 1 },
        { name: 'driverImage', maxCount: 1 },
        { name: 'driverDocument', maxCount: 10 },
      ],
      {
        storage: diskStorage({
          destination: (req, file, callback) => {
            const path = './uploads/documents';
            try {
              if (!fs.existsSync(path)) {
                fs.mkdirSync(path, { recursive: true });
              }
              callback(null, path);
            } catch (error) {
              callback(error as Error, path);
            }
          },
          filename: (req, file, callback) => {
            const uniqueSuffix =
              Date.now() + '-' + Math.round(Math.random() * 1e9);
            const ext = extname(file.originalname);
            let prefix = 'user-upload';
            if (file.fieldname === 'profileImage') prefix = 'party-profile';
            else if (file.fieldname === 'companyImage')
              prefix = 'company-image';
            else if (file.fieldname === 'companyDocument')
              prefix = 'company-doc';
            else if (file.fieldname === 'partyDocument') prefix = 'party-doc';
            else if (file.fieldname === 'treadLicense')
              prefix = 'tread-license';
            else if (file.fieldname === 'driverImage') prefix = 'driver-img';
            else if (file.fieldname === 'driverDocument') prefix = 'driver-doc';
            callback(null, `${prefix}-${uniqueSuffix}${ext}`);
          },
        }),
      },
    ),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Update currently logged-in user profile',
    description:
      'Updates the profile information for the authenticated User, Vendor, Party, or Driver.',
  })
  @ApiBody({ type: UpdateProfileDto })
  @ApiResponse({
    status: 200,
    description: 'Returns the updated profile details.',
  })
  async updateProfile(
    @Req() req: any,
    @Body() body: UpdateProfileDto,
    @UploadedFiles()
    files: {
      profileImage?: Express.Multer.File[];
      companyImage?: Express.Multer.File[];
      companyDocument?: Express.Multer.File[];
      partyDocument?: Express.Multer.File[];
      treadLicense?: Express.Multer.File[];
      driverImage?: Express.Multer.File[];
      driverDocument?: Express.Multer.File[];
    },
  ) {
    const { sub, roles } = req.user;

    // Attach uploaded files to body if they exist
    if (files) {
      if (files.profileImage && files.profileImage.length > 0) {
        body.profileImage = `/uploads/documents/${files.profileImage[0].filename}`;
      }
      if (files.companyImage && files.companyImage.length > 0) {
        body.companyImage = `/uploads/documents/${files.companyImage[0].filename}`;
      }
      if (files.companyDocument && files.companyDocument.length > 0) {
        body.companyDocument = files.companyDocument.map(
          (file) => `/uploads/documents/${file.filename}`,
        );
      }
      if (files.partyDocument && files.partyDocument.length > 0) {
        body.partyDocument = files.partyDocument.map(
          (file) => `/uploads/documents/${file.filename}`,
        );
      }
      if (files.treadLicense && files.treadLicense.length > 0) {
        body.treadLicense = `/uploads/documents/${files.treadLicense[0].filename}`;
      }
      if (files.driverImage && files.driverImage.length > 0) {
        body.driverImage = `/uploads/documents/${files.driverImage[0].filename}`;
      }
      if (files.driverDocument && files.driverDocument.length > 0) {
        body.driverDocument = files.driverDocument.map(
          (file) => `/uploads/documents/${file.filename}`,
        );
      }
    }

    if (roles.includes(Role.SUPER_ADMIN) || roles.includes(Role.ADMIN)) {
      const { name, email, phoneNumber, password } = body;
      const updateData: any = {};
      if (name !== undefined) updateData.name = name;
      if (email !== undefined) updateData.email = email;
      if (phoneNumber !== undefined) updateData.phoneNumber = phoneNumber;
      if (password) {
        updateData.password = await argon2.hash(password, {
          type: argon2.argon2id,
          memoryCost: 65536,
          timeCost: 3,
        });
      }
      await this.usersService.update(sub, updateData);
      return this.getProfile(req);
    }

    if (roles.includes(Role.VENDOR)) {
      const updateData: any = {};
      if (body.phoneNumber !== undefined)
        updateData.phoneNumber = body.phoneNumber;
      if (body.password !== undefined) updateData.password = body.password;
      if (body.companyName !== undefined)
        updateData.companyName = body.companyName;
      if (body.ownerName !== undefined) updateData.ownerName = body.ownerName;
      if (body.email !== undefined) updateData.email = body.email;
      if (body.district !== undefined) updateData.district = body.district;
      if (body.upozela !== undefined) updateData.upozela = body.upozela;
      if (body.address !== undefined) updateData.address = body.address;
      if (body.categoryId !== undefined)
        updateData.categoryId = body.categoryId;
      if (body.incomeTax !== undefined) updateData.incomeTax = body.incomeTax;
      if (body.companyDocument !== undefined)
        updateData.companyDocument = body.companyDocument;
      if (body.companyImage !== undefined)
        updateData.companyImage = body.companyImage;

      await this.companyService.update(sub, updateData, req.user);
      return this.getProfile(req);
    }

    if (roles.includes(Role.PARTY)) {
      const updateData: any = {};
      if (body.partyName !== undefined) updateData.partyName = body.partyName;
      if (body.businessName !== undefined)
        updateData.businessName = body.businessName;
      if (body.phoneNumber !== undefined)
        updateData.phoneNumber = body.phoneNumber;
      if (body.email !== undefined) updateData.email = body.email;
      if (body.password !== undefined) updateData.password = body.password;
      if (body.address !== undefined) updateData.address = body.address;
      if (body.district !== undefined) updateData.district = body.district;
      if (body.upozela !== undefined) updateData.upozela = body.upozela;

      const bazzarAreaValue = body.bazzarArea || body.bazzar || body.area;
      if (bazzarAreaValue !== undefined) {
        updateData.bazzarArea = bazzarAreaValue;
      }

      if (body.description !== undefined)
        updateData.description = body.description;

      if (body.openingDue !== undefined) {
        const openingDue = Number(body.openingDue);
        updateData.openingDue = isNaN(openingDue) ? 0 : openingDue;
      }
      if (body.creditLimit !== undefined) {
        const creditLimit = Number(body.creditLimit);
        updateData.creditLimit = isNaN(creditLimit) ? 0 : creditLimit;
      }

      if (body.treadLicense !== undefined)
        updateData.treadLicense = body.treadLicense;
      if (body.partyDocument !== undefined)
        updateData.partyDocument = body.partyDocument;
      if (body.profileImage !== undefined)
        updateData.profileImage = body.profileImage;
      if (body.categoryId !== undefined)
        updateData.categoryId = body.categoryId;
      if (body.companyId !== undefined) updateData.companyId = body.companyId;

      await this.partyService.update(sub, updateData, req.user);
      return this.getProfile(req);
    }

    if (roles.includes(Role.DRIVER)) {
      const updateData: any = {};
      if (body.phoneNumber !== undefined)
        updateData.phoneNumber = body.phoneNumber;
      if (body.password !== undefined) updateData.password = body.password;
      if (body.email !== undefined) updateData.email = body.email;

      const driverImageVal = body.driverImage || body.profileImage;
      if (driverImageVal !== undefined) updateData.driverImage = driverImageVal;

      if (body.categoryId !== undefined)
        updateData.categoryId = body.categoryId;
      if (body.driverName !== undefined)
        updateData.driverName = body.driverName;
      if (body.address !== undefined) updateData.address = body.address;
      if (body.district !== undefined) updateData.district = body.district;

      const upozelaVal = body.upozela || body.upazela;
      if (upozelaVal !== undefined) updateData.upozela = upozelaVal;

      if (body.loadCapacity !== undefined)
        updateData.loadCapacity = body.loadCapacity;
      if (body.drivingLicenceNumber !== undefined)
        updateData.drivingLicenceNumber = body.drivingLicenceNumber;
      if (body.nidNumber !== undefined) updateData.nidNumber = body.nidNumber;
      if (body.driverDocument !== undefined)
        updateData.driverDocument = body.driverDocument;

      const truckNumberVal = body.truckNumber || body.trackNumber;
      if (truckNumberVal !== undefined) updateData.truckNumber = truckNumberVal;

      const truckTypeVal = body.truckType || body.trackType;
      if (truckTypeVal !== undefined) updateData.truckType = truckTypeVal;

      await this.driverService.update(sub, updateData, req.user);
      return this.getProfile(req);
    }

    throw new NotFoundException('Profile role not matched');
  }
}
