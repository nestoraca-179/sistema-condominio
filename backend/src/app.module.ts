import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { CondominiumsModule } from './modules/condominiums/condominiums.module';
import { BuildingsModule } from './modules/buildings/buildings.module';
import { FeesModule } from './modules/fees/fees.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { DebtsModule } from './modules/debts/debts.module';
import { ExchangeRatesModule } from './modules/exchange-rates/exchange-rates.module';
import { NoticesModule } from './modules/notices/notices.module';
import { ReportsModule } from './modules/reports/reports.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';

import { User } from './modules/users/user.entity';
import { Condominium } from './modules/condominiums/condominium.entity';
import { Building } from './modules/buildings/building.entity';
import { Unit } from './modules/buildings/unit.entity';
import { Fee } from './modules/fees/fee.entity';
import { Payment } from './modules/payments/payment.entity';
import { Debt } from './modules/debts/debt.entity';
import { ExchangeRate } from './modules/exchange-rates/exchange-rate.entity';
import { Notice } from './modules/notices/notice.entity';
import { NotificationLog } from './modules/notices/notification-log.entity';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get('DB_HOST', 'localhost'),
        port: parseInt(config.get('DB_PORT', '5432'), 10),
        username: config.get('DB_USERNAME', 'postgres'),
        password: config.get('DB_PASSWORD', 'postgres'),
        database: config.get('DB_DATABASE', 'sistema_condominio'),
        entities: [
          User, Condominium, Building, Unit, Fee, Payment,
          Debt, ExchangeRate, Notice, NotificationLog,
        ],
        synchronize: config.get('NODE_ENV') !== 'production',
        logging: config.get('NODE_ENV') === 'development' ? ['error'] : false,
      }),
      inject: [ConfigService],
    }),
    AuthModule,
    UsersModule,
    CondominiumsModule,
    BuildingsModule,
    FeesModule,
    PaymentsModule,
    DebtsModule,
    ExchangeRatesModule,
    NoticesModule,
    ReportsModule,
    DashboardModule,
  ],
})
export class AppModule {}
