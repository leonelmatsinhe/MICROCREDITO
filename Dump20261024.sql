-- MySQL dump 10.13  Distrib 8.0.40, for Win64 (x86_64)
--
-- Host: 102.207.223.43    Database: mbr_database
-- ------------------------------------------------------
-- Server version	5.5.5-10.11.14-MariaDB-0ubuntu0.24.04.1

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `accounts`
--

DROP TABLE IF EXISTS `accounts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `accounts` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `companyId` int(11) NOT NULL,
  `accountNumber` varchar(255) NOT NULL,
  `accountDescription` varchar(255) DEFAULT NULL,
  `bank_name` varchar(100) NOT NULL DEFAULT '',
  `bank_code` varchar(20) DEFAULT NULL,
  `balance` decimal(15,2) NOT NULL DEFAULT 0.00,
  `initial_balance` decimal(15,2) DEFAULT 0.00,
  `purpose` enum('REEMBOLSO','DESEMBOLSO','MISTO','TAXAS','RESERVA') NOT NULL DEFAULT 'MISTO',
  `type` enum('BANCO','CAIXA_FISICO','MOBILE_MONEY','EWALLET') NOT NULL DEFAULT 'BANCO',
  `is_default_reembolso` tinyint(1) NOT NULL DEFAULT 0,
  `is_default_desembolso` tinyint(1) NOT NULL DEFAULT 0,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `currency` varchar(3) NOT NULL DEFAULT 'MZN',
  `accountHolder` varchar(255) DEFAULT NULL,
  `createdBy` varchar(255) NOT NULL,
  `updatedBy` varchar(255) DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_accounts_company_number` (`companyId`,`accountNumber`),
  KEY `idx_company_purpose_active` (`companyId`,`purpose`,`is_active`),
  CONSTRAINT `fk_accounts_company` FOREIGN KEY (`companyId`) REFERENCES `companies` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `accounts`
--

LOCK TABLES `accounts` WRITE;
/*!40000 ALTER TABLE `accounts` DISABLE KEYS */;
INSERT INTO `accounts` VALUES (1,36,'0316102000234','Absa Bank','Absa Bank','',1430850.00,0.00,'DESEMBOLSO','BANCO',0,1,1,'MZN','MBR Microcrédito','Eliana Munguambe','Eliana Munguambe','2025-02-19 21:05:43','2026-09-14 15:27:15'),(6,2,'258840000000','Colecta M-Pesa (portal)','M-Pesa',NULL,0.00,0.00,'REEMBOLSO','MOBILE_MONEY',1,0,1,'MZN','+Mola, Lda','sistema','sistema','2026-09-12 14:17:31','2026-09-12 14:17:31'),(7,37,'258840000000','Colecta M-Pesa (portal)','M-Pesa',NULL,0.00,0.00,'REEMBOLSO','MOBILE_MONEY',1,0,1,'MZN','MicroMz','sistema','sistema','2026-09-12 14:17:31','2026-09-12 14:17:31'),(8,36,'258840000000','Colecta M-Pesa (portal)','Coleta M-Pesa','',0.00,0.00,'REEMBOLSO','MOBILE_MONEY',0,0,1,'MZN','MBR Microcrédito','sistema','Eliana Munguambe','2026-09-12 14:17:31','2026-09-14 12:08:59'),(9,36,'4235502110001','FNB','FNB','01423',2378.00,2378.00,'REEMBOLSO','BANCO',0,0,1,'MZN','MBR Microcrédito','Eliana Munguambe','Eliana Munguambe','2026-09-14 14:28:45','2026-10-06 11:37:31'),(10,36,'3506362310001','Moza Banco','Moza Banco','01234',130.56,40.56,'REEMBOLSO','BANCO',1,0,1,'MZN','MBR Microcrédito','Eliana Munguambe','Eliana Munguambe','2026-09-14 14:31:58','2026-09-14 14:43:46');
/*!40000 ALTER TABLE `accounts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `amortization_loans`
--

DROP TABLE IF EXISTS `amortization_loans`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `amortization_loans` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `companyId` int(11) NOT NULL,
  `loanId` int(11) NOT NULL,
  `installmentOrder` varchar(255) NOT NULL,
  `accountNumber` int(11) NOT NULL,
  `amortization` decimal(15,2) NOT NULL,
  `rateAmount` decimal(15,2) NOT NULL,
  `installment` decimal(15,2) NOT NULL,
  `dueDate` date NOT NULL,
  `status` int(11) NOT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `remainingBalance` decimal(15,2) DEFAULT NULL,
  `paidAmount` decimal(15,2) DEFAULT 0.00,
  `customerId` int(11) DEFAULT NULL,
  `walletId` int(11) DEFAULT NULL,
  `mora_amount` decimal(15,2) NOT NULL DEFAULT 0.00,
  `mora_days` int(11) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `fk_amortization_loan` (`loanId`),
  KEY `fk_amortization_customer` (`customerId`),
  KEY `idx_amortization_walletId` (`walletId`),
  CONSTRAINT `fk_amortization_customer` FOREIGN KEY (`customerId`) REFERENCES `customers` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `fk_amortization_loan` FOREIGN KEY (`loanId`) REFERENCES `customer_loans` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `fk_amortization_wallet` FOREIGN KEY (`walletId`) REFERENCES `financing_wallets` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=892 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `amortization_loans`
--

LOCK TABLES `amortization_loans` WRITE;
/*!40000 ALTER TABLE `amortization_loans` DISABLE KEYS */;
INSERT INTO `amortization_loans` VALUES (797,36,61,'1ª',100,4670.21,2000.00,6670.21,'2026-10-03',0,'2026-09-14 13:50:41','2026-09-14 13:50:41',95329.79,0.00,328,11,0.00,0),(798,36,61,'2ª',100,4763.61,1906.60,6670.21,'2026-11-03',0,'2026-09-14 13:50:41','2026-09-14 13:50:41',90566.18,0.00,328,11,0.00,0),(799,36,61,'3ª',100,4858.89,1811.32,6670.21,'2026-12-03',0,'2026-09-14 13:50:41','2026-09-14 13:50:41',85707.29,0.00,328,11,0.00,0),(800,36,61,'4ª',100,4956.06,1714.15,6670.21,'2027-01-03',0,'2026-09-14 13:50:41','2026-09-14 13:50:41',80751.22,0.00,328,11,0.00,0),(801,36,61,'5ª',100,5055.19,1615.02,6670.21,'2027-02-03',0,'2026-09-14 13:50:41','2026-09-14 13:50:41',75696.04,0.00,328,11,0.00,0),(802,36,61,'6ª',100,5156.29,1513.92,6670.21,'2027-03-03',0,'2026-09-14 13:50:41','2026-09-14 13:50:41',70539.75,0.00,328,11,0.00,0),(803,36,61,'7ª',100,5259.42,1410.79,6670.21,'2027-04-03',0,'2026-09-14 13:50:41','2026-09-14 13:50:41',65280.33,0.00,328,11,0.00,0),(804,36,61,'8ª',100,5364.60,1305.61,6670.21,'2027-05-03',0,'2026-09-14 13:50:41','2026-09-14 13:50:41',59915.73,0.00,328,11,0.00,0),(805,36,61,'9ª',100,5471.90,1198.31,6670.21,'2027-06-03',0,'2026-09-14 13:50:41','2026-09-14 13:50:41',54443.83,0.00,328,11,0.00,0),(806,36,61,'10ª',100,5581.33,1088.88,6670.21,'2027-07-03',0,'2026-09-14 13:50:41','2026-09-14 13:50:41',48862.50,0.00,328,11,0.00,0),(807,36,61,'11ª',100,5692.96,977.25,6670.21,'2027-08-03',0,'2026-09-14 13:50:41','2026-09-14 13:50:41',43169.54,0.00,328,11,0.00,0),(808,36,61,'12ª',100,5806.82,863.39,6670.21,'2027-09-03',0,'2026-09-14 13:50:41','2026-09-14 13:50:41',37362.72,0.00,328,11,0.00,0),(809,36,61,'13ª',100,5922.96,747.25,6670.21,'2027-10-03',0,'2026-09-14 13:50:41','2026-09-14 13:50:41',31439.77,0.00,328,11,0.00,0),(810,36,61,'14ª',100,6041.41,628.80,6670.21,'2027-11-03',0,'2026-09-14 13:50:41','2026-09-14 13:50:41',25398.35,0.00,328,11,0.00,0),(811,36,61,'15ª',100,6162.24,507.97,6670.21,'2027-12-03',0,'2026-09-14 13:50:41','2026-09-14 13:50:41',19236.11,0.00,328,11,0.00,0),(812,36,61,'16ª',100,6285.49,384.72,6670.21,'2028-01-03',0,'2026-09-14 13:50:41','2026-09-14 13:50:41',12950.62,0.00,328,11,0.00,0),(813,36,61,'17ª',100,6411.20,259.01,6670.21,'2028-02-03',0,'2026-09-14 13:50:41','2026-09-14 13:50:41',6539.42,0.00,328,11,0.00,0),(814,36,61,'18ª',100,6539.42,130.79,6670.21,'2028-03-03',0,'2026-09-14 13:50:41','2026-09-14 13:50:41',0.00,0.00,328,11,0.00,0),(815,36,62,'1ª',101,2179.11,8100.00,10279.11,'2026-10-03',0,'2026-09-14 13:51:10','2026-09-14 13:51:10',87820.89,0.00,329,11,0.00,0),(816,36,62,'2ª',101,2375.23,7903.88,10279.11,'2026-11-03',0,'2026-09-14 13:51:10','2026-09-14 13:51:10',85445.67,0.00,329,11,0.00,0),(817,36,62,'3ª',101,2589.00,7690.11,10279.11,'2026-12-03',0,'2026-09-14 13:51:10','2026-09-14 13:51:10',82856.67,0.00,329,11,0.00,0),(818,36,62,'4ª',101,2822.01,7457.10,10279.11,'2027-01-03',0,'2026-09-14 13:51:10','2026-09-14 13:51:10',80034.67,0.00,329,11,0.00,0),(819,36,62,'5ª',101,3075.99,7203.12,10279.11,'2027-02-03',0,'2026-09-14 13:51:10','2026-09-14 13:51:10',76958.68,0.00,329,11,0.00,0),(820,36,62,'6ª',101,3352.82,6926.28,10279.11,'2027-03-03',0,'2026-09-14 13:51:10','2026-09-14 13:51:10',73605.86,0.00,329,11,0.00,0),(821,36,62,'7ª',101,3654.58,6624.53,10279.11,'2027-04-03',0,'2026-09-14 13:51:10','2026-09-14 13:51:10',69951.28,0.00,329,11,0.00,0),(822,36,62,'8ª',101,3983.49,6295.61,10279.11,'2027-05-03',0,'2026-09-14 13:51:10','2026-09-14 13:51:10',65967.78,0.00,329,11,0.00,0),(823,36,62,'9ª',101,4342.01,5937.10,10279.11,'2027-06-03',0,'2026-09-14 13:51:10','2026-09-14 13:51:10',61625.78,0.00,329,11,0.00,0),(824,36,62,'10ª',101,4732.79,5546.32,10279.11,'2027-07-03',0,'2026-09-14 13:51:10','2026-09-14 13:51:10',56892.99,0.00,329,11,0.00,0),(825,36,62,'11ª',101,5158.74,5120.37,10279.11,'2027-08-03',0,'2026-09-14 13:51:10','2026-09-14 13:51:10',51734.26,0.00,329,11,0.00,0),(826,36,62,'12ª',101,5623.02,4656.08,10279.11,'2027-09-03',0,'2026-09-14 13:51:10','2026-09-14 13:51:10',46111.23,0.00,329,11,0.00,0),(827,36,62,'13ª',101,6129.10,4150.01,10279.11,'2027-10-03',0,'2026-09-14 13:51:10','2026-09-14 13:51:10',39982.14,0.00,329,11,0.00,0),(828,36,62,'14ª',101,6680.71,3598.39,10279.11,'2027-11-03',0,'2026-09-14 13:51:10','2026-09-14 13:51:10',33301.42,0.00,329,11,0.00,0),(829,36,62,'15ª',101,7281.98,2997.13,10279.11,'2027-12-03',0,'2026-09-14 13:51:10','2026-09-14 13:51:10',26019.45,0.00,329,11,0.00,0),(830,36,62,'16ª',101,7937.36,2341.75,10279.11,'2028-01-03',0,'2026-09-14 13:51:10','2026-09-14 13:51:10',18082.09,0.00,329,11,0.00,0),(831,36,62,'17ª',101,8651.72,1627.39,10279.11,'2028-02-03',0,'2026-09-14 13:51:10','2026-09-14 13:51:10',9430.37,0.00,329,11,0.00,0),(832,36,62,'18ª',101,9430.37,848.73,10279.11,'2028-03-03',0,'2026-09-14 13:51:10','2026-09-14 13:51:10',0.00,0.00,329,11,0.00,0),(833,36,63,'1ª',102,934.04,400.00,1334.04,'2026-10-03',0,'2026-09-14 13:51:35','2026-09-14 13:51:35',19065.96,0.00,330,11,0.00,0),(834,36,63,'2ª',102,952.72,381.32,1334.04,'2026-11-03',0,'2026-09-14 13:51:35','2026-09-14 13:51:35',18113.24,0.00,330,11,0.00,0),(835,36,63,'3ª',102,971.78,362.26,1334.04,'2026-12-03',0,'2026-09-14 13:51:35','2026-09-14 13:51:35',17141.46,0.00,330,11,0.00,0),(836,36,63,'4ª',102,991.21,342.83,1334.04,'2027-01-03',0,'2026-09-14 13:51:35','2026-09-14 13:51:35',16150.24,0.00,330,11,0.00,0),(837,36,63,'5ª',102,1011.04,323.00,1334.04,'2027-02-03',0,'2026-09-14 13:51:35','2026-09-14 13:51:35',15139.21,0.00,330,11,0.00,0),(838,36,63,'6ª',102,1031.26,302.78,1334.04,'2027-03-03',0,'2026-09-14 13:51:35','2026-09-14 13:51:35',14107.95,0.00,330,11,0.00,0),(839,36,63,'7ª',102,1051.88,282.16,1334.04,'2027-04-03',0,'2026-09-14 13:51:35','2026-09-14 13:51:35',13056.07,0.00,330,11,0.00,0),(840,36,63,'8ª',102,1072.92,261.12,1334.04,'2027-05-03',0,'2026-09-14 13:51:35','2026-09-14 13:51:35',11983.15,0.00,330,11,0.00,0),(841,36,63,'9ª',102,1094.38,239.66,1334.04,'2027-06-03',0,'2026-09-14 13:51:35','2026-09-14 13:51:35',10888.77,0.00,330,11,0.00,0),(842,36,63,'10ª',102,1116.27,217.78,1334.04,'2027-07-03',0,'2026-09-14 13:51:35','2026-09-14 13:51:35',9772.50,0.00,330,11,0.00,0),(843,36,63,'11ª',102,1138.59,195.45,1334.04,'2027-08-03',0,'2026-09-14 13:51:35','2026-09-14 13:51:35',8633.91,0.00,330,11,0.00,0),(844,36,63,'12ª',102,1161.36,172.68,1334.04,'2027-09-03',0,'2026-09-14 13:51:35','2026-09-14 13:51:35',7472.54,0.00,330,11,0.00,0),(845,36,63,'13ª',102,1184.59,149.45,1334.04,'2027-10-03',0,'2026-09-14 13:51:35','2026-09-14 13:51:35',6287.95,0.00,330,11,0.00,0),(846,36,63,'14ª',102,1208.28,125.76,1334.04,'2027-11-03',0,'2026-09-14 13:51:35','2026-09-14 13:51:35',5079.67,0.00,330,11,0.00,0),(847,36,63,'15ª',102,1232.45,101.59,1334.04,'2027-12-03',0,'2026-09-14 13:51:35','2026-09-14 13:51:35',3847.22,0.00,330,11,0.00,0),(848,36,63,'16ª',102,1257.10,76.94,1334.04,'2028-01-03',0,'2026-09-14 13:51:35','2026-09-14 13:51:35',2590.12,0.00,330,11,0.00,0),(849,36,63,'17ª',102,1282.24,51.80,1334.04,'2028-02-03',0,'2026-09-14 13:51:35','2026-09-14 13:51:35',1307.88,0.00,330,11,0.00,0),(850,36,63,'18ª',102,1307.88,26.16,1334.04,'2028-03-03',0,'2026-09-14 13:51:35','2026-09-14 13:51:35',0.00,0.00,330,11,0.00,0),(851,36,66,'1ª',105,14010.63,6000.00,20010.63,'2026-10-03',0,'2026-09-14 13:52:03','2026-09-14 13:52:03',285989.37,0.00,333,11,0.00,0),(852,36,66,'2ª',105,14290.84,5719.79,20010.63,'2026-11-03',0,'2026-09-14 13:52:03','2026-09-14 13:52:03',271698.53,0.00,333,11,0.00,0),(853,36,66,'3ª',105,14576.66,5433.97,20010.63,'2026-12-03',0,'2026-09-14 13:52:03','2026-09-14 13:52:03',257121.87,0.00,333,11,0.00,0),(854,36,66,'4ª',105,14868.19,5142.44,20010.63,'2027-01-03',0,'2026-09-14 13:52:03','2026-09-14 13:52:03',242253.67,0.00,333,11,0.00,0),(855,36,66,'5ª',105,15165.56,4845.07,20010.63,'2027-02-03',0,'2026-09-14 13:52:03','2026-09-14 13:52:03',227088.12,0.00,333,11,0.00,0),(856,36,66,'6ª',105,15468.87,4541.76,20010.63,'2027-03-03',0,'2026-09-14 13:52:03','2026-09-14 13:52:03',211619.25,0.00,333,11,0.00,0),(857,36,66,'7ª',105,15778.25,4232.38,20010.63,'2027-04-03',0,'2026-09-14 13:52:03','2026-09-14 13:52:03',195841.00,0.00,333,11,0.00,0),(858,36,66,'8ª',105,16093.81,3916.82,20010.63,'2027-05-03',0,'2026-09-14 13:52:03','2026-09-14 13:52:03',179747.19,0.00,333,11,0.00,0),(859,36,66,'9ª',105,16415.69,3594.94,20010.63,'2027-06-03',0,'2026-09-14 13:52:03','2026-09-14 13:52:03',163331.50,0.00,333,11,0.00,0),(860,36,66,'10ª',105,16744.00,3266.63,20010.63,'2027-07-03',0,'2026-09-14 13:52:03','2026-09-14 13:52:03',146587.50,0.00,333,11,0.00,0),(861,36,66,'11ª',105,17078.88,2931.75,20010.63,'2027-08-03',0,'2026-09-14 13:52:03','2026-09-14 13:52:03',129508.62,0.00,333,11,0.00,0),(862,36,66,'12ª',105,17420.46,2590.17,20010.63,'2027-09-03',0,'2026-09-14 13:52:03','2026-09-14 13:52:03',112088.16,0.00,333,11,0.00,0),(863,36,66,'13ª',105,17768.87,2241.76,20010.63,'2027-10-03',0,'2026-09-14 13:52:03','2026-09-14 13:52:03',94319.30,0.00,333,11,0.00,0),(864,36,66,'14ª',105,18124.24,1886.39,20010.63,'2027-11-03',0,'2026-09-14 13:52:03','2026-09-14 13:52:03',76195.05,0.00,333,11,0.00,0),(865,36,66,'15ª',105,18486.73,1523.90,20010.63,'2027-12-03',0,'2026-09-14 13:52:03','2026-09-14 13:52:03',57708.32,0.00,333,11,0.00,0),(866,36,66,'16ª',105,18856.46,1154.17,20010.63,'2028-01-03',0,'2026-09-14 13:52:03','2026-09-14 13:52:03',38851.86,0.00,333,11,0.00,0),(867,36,66,'17ª',105,19233.59,777.04,20010.63,'2028-02-03',0,'2026-09-14 13:52:03','2026-09-14 13:52:03',19618.27,0.00,333,11,0.00,0),(868,36,66,'18ª',105,19618.27,392.37,20010.63,'2028-03-03',0,'2026-09-14 13:52:03','2026-09-14 13:52:03',0.00,0.00,333,11,0.00,0),(869,36,67,'1ª',106,7005.32,3000.00,10005.32,'2026-10-03',0,'2026-09-14 13:53:42','2026-09-14 13:53:42',142994.68,0.00,334,11,0.00,0),(870,36,67,'2ª',106,7145.42,2859.89,10005.32,'2026-11-03',0,'2026-09-14 13:53:42','2026-09-14 13:53:42',135849.26,0.00,334,11,0.00,0),(871,36,67,'3ª',106,7288.33,2716.99,10005.32,'2026-12-03',0,'2026-09-14 13:53:42','2026-09-14 13:53:42',128560.93,0.00,334,11,0.00,0),(872,36,67,'4ª',106,7434.10,2571.22,10005.32,'2027-01-03',0,'2026-09-14 13:53:42','2026-09-14 13:53:42',121126.84,0.00,334,11,0.00,0),(873,36,67,'5ª',106,7582.78,2422.54,10005.32,'2027-02-03',0,'2026-09-14 13:53:42','2026-09-14 13:53:42',113544.06,0.00,334,11,0.00,0),(874,36,67,'6ª',106,7734.43,2270.88,10005.32,'2027-03-03',0,'2026-09-14 13:53:42','2026-09-14 13:53:42',105809.62,0.00,334,11,0.00,0),(875,36,67,'7ª',106,7889.12,2116.19,10005.32,'2027-04-03',0,'2026-09-14 13:53:42','2026-09-14 13:53:42',97920.50,0.00,334,11,0.00,0),(876,36,67,'8ª',106,8046.91,1958.41,10005.32,'2027-05-03',0,'2026-09-14 13:53:42','2026-09-14 13:53:42',89873.60,0.00,334,11,0.00,0),(877,36,67,'9ª',106,8207.84,1797.47,10005.32,'2027-06-03',0,'2026-09-14 13:53:42','2026-09-14 13:53:42',81665.75,0.00,334,11,0.00,0),(878,36,67,'10ª',106,8372.00,1633.32,10005.32,'2027-07-03',0,'2026-09-14 13:53:42','2026-09-14 13:53:42',73293.75,0.00,334,11,0.00,0),(879,36,67,'11ª',106,8539.44,1465.88,10005.32,'2027-08-03',0,'2026-09-14 13:53:42','2026-09-14 13:53:42',64754.31,0.00,334,11,0.00,0),(880,36,67,'12ª',106,8710.23,1295.09,10005.32,'2027-09-03',0,'2026-09-14 13:53:42','2026-09-14 13:53:42',56044.08,0.00,334,11,0.00,0),(881,36,67,'13ª',106,8884.43,1120.88,10005.32,'2027-10-03',0,'2026-09-14 13:53:42','2026-09-14 13:53:42',47159.65,0.00,334,11,0.00,0),(882,36,67,'14ª',106,9062.12,943.19,10005.32,'2027-11-03',0,'2026-09-14 13:53:42','2026-09-14 13:53:42',38097.53,0.00,334,11,0.00,0),(883,36,67,'15ª',106,9243.36,761.95,10005.32,'2027-12-03',0,'2026-09-14 13:53:42','2026-09-14 13:53:42',28854.16,0.00,334,11,0.00,0),(884,36,67,'16ª',106,9428.23,577.08,10005.32,'2028-01-03',0,'2026-09-14 13:53:42','2026-09-14 13:53:42',19425.93,0.00,334,11,0.00,0),(885,36,67,'17ª',106,9616.80,388.52,10005.32,'2028-02-03',0,'2026-09-14 13:53:42','2026-09-14 13:53:42',9809.13,0.00,334,11,0.00,0),(886,36,67,'18ª',106,9809.13,196.18,10005.32,'2028-03-03',0,'2026-09-14 13:53:42','2026-09-14 13:53:42',0.00,0.00,334,11,0.00,0),(887,36,75,'1ª',109,90000.00,7200.00,97200.00,'2026-10-14',0,'2026-09-14 14:34:26','2026-09-14 14:34:26',0.00,0.00,337,14,0.00,0),(889,36,76,'1ª',108,7500.00,600.00,8100.00,'2026-10-11',0,'2026-09-14 14:56:28','2026-09-14 14:56:28',0.00,0.00,336,14,0.00,0),(890,36,77,'1ª',112,1000.00,80.00,1080.00,'2026-10-11',0,'2026-09-14 15:05:41','2026-09-14 15:05:41',0.00,0.00,340,14,0.00,0),(891,36,78,'1ª',113,5650.00,452.00,6102.00,'2026-10-11',0,'2026-09-14 15:27:15','2026-09-14 15:27:15',0.00,0.00,341,14,0.00,0);
/*!40000 ALTER TABLE `amortization_loans` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `approval_rules`
--

DROP TABLE IF EXISTS `approval_rules`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `approval_rules` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `companyId` int(11) DEFAULT NULL,
  `role` varchar(20) NOT NULL,
  `minAmount` decimal(15,2) NOT NULL DEFAULT 0.00,
  `maxAmount` decimal(15,2) DEFAULT NULL,
  `requiredApprovals` int(11) NOT NULL DEFAULT 1,
  `distinctApprovers` tinyint(1) NOT NULL DEFAULT 0,
  `description` varchar(255) DEFAULT NULL,
  `active` tinyint(1) NOT NULL DEFAULT 1,
  `createdAt` datetime NOT NULL DEFAULT current_timestamp(),
  `updatedAt` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_approval_rules_company` (`companyId`,`active`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `approval_rules`
--

LOCK TABLES `approval_rules` WRITE;
/*!40000 ALTER TABLE `approval_rules` DISABLE KEYS */;
INSERT INTO `approval_rules` VALUES (1,NULL,'ADMIN',0.00,NULL,1,0,'Administração — aprovação e desembolso exclusivos do Admin (1 aprovação)',1,'2026-10-17 13:42:25','2026-10-17 13:42:25');
/*!40000 ALTER TABLE `approval_rules` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `audit_log`
--

DROP TABLE IF EXISTS `audit_log`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `audit_log` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) DEFAULT NULL,
  `company_id` int(11) DEFAULT NULL,
  `ip` varchar(64) DEFAULT NULL,
  `action` varchar(60) NOT NULL,
  `entity` varchar(60) NOT NULL,
  `entity_id` int(11) DEFAULT NULL,
  `before_data` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`before_data`)),
  `after_data` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`after_data`)),
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_audit_entity` (`entity`,`entity_id`),
  KEY `idx_audit_user` (`user_id`),
  KEY `idx_audit_created` (`created_at`)
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `audit_log`
--

LOCK TABLES `audit_log` WRITE;
/*!40000 ALTER TABLE `audit_log` DISABLE KEYS */;
INSERT INTO `audit_log` VALUES (1,NULL,36,NULL,'CONCESSION_EMIT','concession_packages',1,NULL,'{\"loanId\":78,\"package_hash\":\"fde689b4e3d0fc224779cbfea2686107e6a6d73a5bf1bef788bc3dcb27d43c4f\",\"docs\":[\"termo\",\"garantias\",\"contrato\",\"plano\"]}','2026-10-01 13:09:49'),(2,NULL,36,NULL,'CONCESSION_EMIT','concession_packages',2,NULL,'{\"loanId\":77,\"package_hash\":\"72a555ca4d1a07068d6de940bfe4b30bb525a2f3b21eb8c8ecf91ef03afaf952\",\"docs\":[\"termo\",\"garantias\",\"contrato\",\"plano\"]}','2026-10-01 13:09:50'),(3,NULL,36,NULL,'CONCESSION_EMIT','concession_packages',3,NULL,'{\"loanId\":76,\"package_hash\":\"a081c94743356b32bc0a013d362ae73beae4373b75d81dfea72f859307541c60\",\"docs\":[\"termo\",\"garantias\",\"contrato\",\"plano\"]}','2026-10-01 13:09:50'),(4,NULL,36,NULL,'CONCESSION_EMIT','concession_packages',4,NULL,'{\"loanId\":75,\"package_hash\":\"b453507742c34e178db1593e01863ef17283d3e70f62cb627d7fb3525e3bee13\",\"docs\":[\"termo\",\"garantias\",\"contrato\",\"plano\"]}','2026-10-01 13:09:50'),(5,NULL,36,NULL,'CONCESSION_EMIT','concession_packages',5,NULL,'{\"loanId\":67,\"package_hash\":\"25415863665eaa9b72d8b7339e7d598a59d3bc13ae375af04387c37b2d89981f\",\"docs\":[\"termo\",\"garantias\",\"contrato\",\"plano\"]}','2026-10-01 13:09:50'),(6,NULL,36,NULL,'CONCESSION_EMIT','concession_packages',6,NULL,'{\"loanId\":66,\"package_hash\":\"02232d74f5f5605bc70019343cb0b2d7af0b29455a88e1e15e73b5c1299d238a\",\"docs\":[\"termo\",\"garantias\",\"contrato\",\"plano\"]}','2026-10-01 13:09:51'),(7,NULL,36,NULL,'CONCESSION_EMIT','concession_packages',7,NULL,'{\"loanId\":63,\"package_hash\":\"c0f3b0e7d07dabff31e3b04e4550510a45a1a328c7c027b97db2da4ff2573a5e\",\"docs\":[\"termo\",\"garantias\",\"contrato\",\"plano\"]}','2026-10-01 13:09:51'),(8,NULL,36,NULL,'CONCESSION_EMIT','concession_packages',8,NULL,'{\"loanId\":62,\"package_hash\":\"671eea6fbaa9b39b365fbe8e835be985c9a69c591cb08e6714c088aeabb20be9\",\"docs\":[\"termo\",\"garantias\",\"contrato\",\"plano\"]}','2026-10-01 13:09:51'),(9,NULL,36,NULL,'CONCESSION_EMIT','concession_packages',9,NULL,'{\"loanId\":61,\"package_hash\":\"c22ce3cfca5a0806ddfd59c90927fab7ae6b500bde9a4dd15ad1c235022914a3\",\"docs\":[\"termo\",\"garantias\",\"contrato\",\"plano\"]}','2026-10-01 13:09:51'),(10,354,36,'::ffff:197.218.117.26','CONCESSION_DOWNLOAD','concession_packages',5,NULL,'{\"loanId\":67,\"doc\":\"termo\",\"hash\":\"25415863665eaa9b72d8b7339e7d598a59d3bc13ae375af04387c37b2d89981f\"}','2026-10-02 08:17:36'),(11,354,36,'::ffff:197.218.117.26','CONCESSION_DOWNLOAD','concession_packages',5,NULL,'{\"loanId\":67,\"doc\":\"garantias\",\"hash\":\"25415863665eaa9b72d8b7339e7d598a59d3bc13ae375af04387c37b2d89981f\"}','2026-10-02 08:17:55'),(12,354,36,'::ffff:197.218.117.26','CONCESSION_DOWNLOAD','concession_packages',5,NULL,'{\"loanId\":67,\"doc\":\"contrato\",\"hash\":\"25415863665eaa9b72d8b7339e7d598a59d3bc13ae375af04387c37b2d89981f\"}','2026-10-02 08:18:05'),(13,354,36,'::ffff:197.218.117.26','CONCESSION_DOWNLOAD','concession_packages',5,NULL,'{\"loanId\":67,\"doc\":\"plano\",\"hash\":\"25415863665eaa9b72d8b7339e7d598a59d3bc13ae375af04387c37b2d89981f\"}','2026-10-02 08:18:30');
/*!40000 ALTER TABLE `audit_log` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `bank_transactions`
--

DROP TABLE IF EXISTS `bank_transactions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `bank_transactions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `companyId` int(11) NOT NULL,
  `accountId` int(11) NOT NULL,
  `cashRegisterId` int(11) DEFAULT NULL,
  `type` enum('ENTRADA','SAIDA') NOT NULL,
  `category` enum('REEMBOLSO_BANCO','DESEMBOLSO_BANCO','DEPOSITO_CAIXA','LEVANTAMENTO_BANCO','TAXA_BANCARIA','ESTORNO','OUTROS') NOT NULL,
  `amount` decimal(15,2) NOT NULL,
  `balanceAfter` decimal(15,2) NOT NULL DEFAULT 0.00,
  `description` varchar(255) NOT NULL,
  `referenceType` varchar(50) DEFAULT NULL,
  `referenceId` int(11) DEFAULT NULL,
  `createdBy` int(11) DEFAULT NULL,
  `createdAt` datetime DEFAULT NULL,
  `updatedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_bank_transactions_account` (`accountId`,`createdAt`),
  KEY `idx_bank_transactions_register` (`cashRegisterId`)
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `bank_transactions`
--

LOCK TABLES `bank_transactions` WRITE;
/*!40000 ALTER TABLE `bank_transactions` DISABLE KEYS */;
INSERT INTO `bank_transactions` VALUES (1,36,1,NULL,'ENTRADA','ESTORNO',2195000.00,2195000.00,'Saldo disponível na conta FNB','accounts',1,329,'2026-09-14 12:08:26','2026-09-14 12:08:26'),(2,36,1,2,'SAIDA','DESEMBOLSO_BANCO',100000.00,2095000.00,'Desembolso de crédito — conta 100','customer_loans',61,329,'2026-09-14 13:50:41','2026-09-14 13:50:41'),(3,36,1,2,'SAIDA','DESEMBOLSO_BANCO',90000.00,2005000.00,'Desembolso de crédito — conta 101','customer_loans',62,329,'2026-09-14 13:51:10','2026-09-14 13:51:10'),(4,36,1,2,'SAIDA','DESEMBOLSO_BANCO',20000.00,1985000.00,'Desembolso de crédito — conta 102','customer_loans',63,329,'2026-09-14 13:51:35','2026-09-14 13:51:35'),(5,36,1,2,'SAIDA','DESEMBOLSO_BANCO',300000.00,1685000.00,'Desembolso de crédito — conta 105','customer_loans',66,329,'2026-09-14 13:52:03','2026-09-14 13:52:03'),(6,36,1,2,'SAIDA','DESEMBOLSO_BANCO',150000.00,1535000.00,'Desembolso de crédito — conta 106','customer_loans',67,329,'2026-09-14 13:53:43','2026-09-14 13:53:43'),(7,36,9,NULL,'ENTRADA','ESTORNO',2378.00,2378.00,'Saldo inicial','accounts',9,329,'2026-09-14 14:29:30','2026-09-14 14:29:30'),(8,36,10,NULL,'ENTRADA','ESTORNO',40.56,40.56,'Ajuste manual de saldo (0.00 → 40.56 MZN)','accounts',10,329,'2026-09-14 14:32:07','2026-09-14 14:32:07'),(9,36,10,2,'ENTRADA','REEMBOLSO_BANCO',90.00,130.56,'Taxa administrativa do crédito #75 — entrada em Moza Banco 3506362310001','customer_loans',75,329,'2026-09-14 14:34:26','2026-09-14 14:34:26'),(10,36,1,2,'SAIDA','DESEMBOLSO_BANCO',90000.00,1445000.00,'Desembolso de crédito — conta 109','customer_loans',75,329,'2026-09-14 14:34:26','2026-09-14 14:34:26'),(11,36,1,2,'SAIDA','DESEMBOLSO_BANCO',7500.00,1437500.00,'Desembolso de crédito — conta 108','customer_loans',76,329,'2026-09-14 14:56:28','2026-09-14 14:56:28'),(12,36,1,2,'SAIDA','DESEMBOLSO_BANCO',1000.00,1436500.00,'Desembolso de crédito — conta 112','customer_loans',77,329,'2026-09-14 15:05:41','2026-09-14 15:05:41'),(13,36,1,2,'SAIDA','DESEMBOLSO_BANCO',5650.00,1430850.00,'Desembolso de crédito — conta 113','customer_loans',78,329,'2026-09-14 15:27:15','2026-09-14 15:27:15');
/*!40000 ALTER TABLE `bank_transactions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `cash_differences`
--

DROP TABLE IF EXISTS `cash_differences`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `cash_differences` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `companyId` int(11) NOT NULL,
  `cashRegisterId` int(11) NOT NULL,
  `cashMovementId` int(11) DEFAULT NULL,
  `userId` int(11) DEFAULT NULL,
  `data_caixa` varchar(10) DEFAULT NULL,
  `tipo` enum('QUEBRA','SOBRA') NOT NULL,
  `valor` decimal(15,2) NOT NULL,
  `valor_contado` decimal(15,2) DEFAULT NULL,
  `valor_apurado` decimal(15,2) DEFAULT NULL,
  `conta_contabilistica` varchar(10) NOT NULL DEFAULT '58',
  `status` enum('PENDENTE','JUSTIFICADA') NOT NULL DEFAULT 'PENDENTE',
  `observacao_operador` text DEFAULT NULL,
  `justificacao` text DEFAULT NULL,
  `justifiedBy` int(11) DEFAULT NULL,
  `justifiedAt` datetime DEFAULT NULL,
  `createdAt` datetime DEFAULT NULL,
  `updatedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_cash_differences_company_status` (`companyId`,`status`),
  KEY `idx_cash_differences_register` (`cashRegisterId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cash_differences`
--

LOCK TABLES `cash_differences` WRITE;
/*!40000 ALTER TABLE `cash_differences` DISABLE KEYS */;
/*!40000 ALTER TABLE `cash_differences` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `cash_movements`
--

DROP TABLE IF EXISTS `cash_movements`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `cash_movements` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `companyId` int(11) NOT NULL,
  `cashRegisterId` int(11) NOT NULL,
  `type` enum('ENTRADA','SAIDA') NOT NULL,
  `category` enum('DESEMBOLSO','REEMBOLSO','JUROS_MORA','TAXA_ADMIN','ENTREGA_COFRE','REFORCO_CAIXA','DEPOSITO_BANCARIO','DIFERENCA_CAIXA','DEPOSITO_BANCO','LEVANTAMENTO_BANCO','TRANSFERENCIA','INTERNET','LUZ','AGUA','COMBUSTIVEL','RENTABILIDADE','SALARIOS','SALARIO','REUNIAO','TRANSPORTE','MATERIAL','OUTROS') NOT NULL,
  `amount` decimal(15,2) NOT NULL,
  `description` varchar(255) NOT NULL,
  `loanId` int(11) DEFAULT NULL,
  `amortizationLoanId` int(11) DEFAULT NULL,
  `tranzactionId` int(11) DEFAULT NULL,
  `customerId` int(11) DEFAULT NULL,
  `isAutomatic` tinyint(1) NOT NULL DEFAULT 0,
  `createdBy` int(11) DEFAULT NULL,
  `createdAt` datetime DEFAULT NULL,
  `updatedAt` datetime DEFAULT NULL,
  `bankAccountId` int(11) DEFAULT NULL,
  `paymentMethod` enum('CASH','BANK','MPESA','EMOLA') NOT NULL DEFAULT 'CASH',
  `referenceType` varchar(50) DEFAULT NULL,
  `referenceId` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_cash_movements_register` (`cashRegisterId`),
  KEY `idx_cash_movements_tranzaction` (`tranzactionId`)
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cash_movements`
--

LOCK TABLES `cash_movements` WRITE;
/*!40000 ALTER TABLE `cash_movements` DISABLE KEYS */;
INSERT INTO `cash_movements` VALUES (1,36,2,'SAIDA','DESEMBOLSO',100000.00,'Desembolso de crédito — conta 100',61,NULL,NULL,328,1,329,'2026-09-14 13:50:41','2026-09-14 13:50:41',1,'BANK','customer_loans',61),(2,36,2,'SAIDA','DESEMBOLSO',90000.00,'Desembolso de crédito — conta 101',62,NULL,NULL,329,1,329,'2026-09-14 13:51:10','2026-09-14 13:51:10',1,'BANK','customer_loans',62),(3,36,2,'SAIDA','DESEMBOLSO',20000.00,'Desembolso de crédito — conta 102',63,NULL,NULL,330,1,329,'2026-09-14 13:51:35','2026-09-14 13:51:35',1,'BANK','customer_loans',63),(4,36,2,'SAIDA','DESEMBOLSO',300000.00,'Desembolso de crédito — conta 105',66,NULL,NULL,333,1,329,'2026-09-14 13:52:03','2026-09-14 13:52:03',1,'BANK','customer_loans',66),(5,36,2,'SAIDA','DESEMBOLSO',150000.00,'Desembolso de crédito — conta 106',67,NULL,NULL,334,1,329,'2026-09-14 13:53:43','2026-09-14 13:53:43',1,'BANK','customer_loans',67),(6,36,2,'ENTRADA','TAXA_ADMIN',90.00,'Taxa administrativa do crédito #75 — entrada em Moza Banco 3506362310001',75,NULL,NULL,337,1,329,'2026-09-14 14:34:26','2026-09-14 14:34:26',10,'BANK','customer_loans',75),(7,36,2,'SAIDA','DESEMBOLSO',90000.00,'Desembolso de crédito — conta 109',75,NULL,NULL,337,1,329,'2026-09-14 14:34:26','2026-09-14 14:34:26',1,'BANK','customer_loans',75),(9,36,2,'SAIDA','DESEMBOLSO',7500.00,'Desembolso de crédito — conta 108',76,NULL,NULL,336,1,329,'2026-09-14 14:56:28','2026-09-14 14:56:28',1,'BANK','customer_loans',76),(10,36,2,'SAIDA','DESEMBOLSO',1000.00,'Desembolso de crédito — conta 112',77,NULL,NULL,340,1,329,'2026-09-14 15:05:41','2026-09-14 15:05:41',1,'BANK','customer_loans',77),(11,36,2,'SAIDA','DESEMBOLSO',5650.00,'Desembolso de crédito — conta 113',78,NULL,NULL,341,1,329,'2026-09-14 15:27:15','2026-09-14 15:27:15',1,'BANK','customer_loans',78);
/*!40000 ALTER TABLE `cash_movements` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `cash_registers`
--

DROP TABLE IF EXISTS `cash_registers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `cash_registers` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `companyId` int(11) NOT NULL,
  `userId` int(11) NOT NULL,
  `opening_date` varchar(10) NOT NULL,
  `opening_balance` decimal(15,2) NOT NULL DEFAULT 0.00,
  `total_in` decimal(15,2) NOT NULL DEFAULT 0.00,
  `total_out` decimal(15,2) NOT NULL DEFAULT 0.00,
  `status` enum('ABERTO','FECHADO') NOT NULL DEFAULT 'ABERTO',
  `mode` enum('PHYSICAL','ELECTRONIC') NOT NULL DEFAULT 'PHYSICAL',
  `closing_balance_informed` decimal(15,2) DEFAULT NULL,
  `closing_balance_calculated` decimal(15,2) DEFAULT NULL,
  `difference` decimal(15,2) DEFAULT NULL,
  `closed_at` datetime DEFAULT NULL,
  `closedBy` int(11) DEFAULT NULL,
  `createdAt` datetime DEFAULT NULL,
  `updatedAt` datetime DEFAULT NULL,
  `opening_time` datetime DEFAULT NULL,
  `closing_time` datetime DEFAULT NULL,
  `total_cash_in` decimal(15,2) NOT NULL DEFAULT 0.00,
  `total_cash_out` decimal(15,2) NOT NULL DEFAULT 0.00,
  `total_bank_in` decimal(15,2) NOT NULL DEFAULT 0.00,
  `total_bank_out` decimal(15,2) NOT NULL DEFAULT 0.00,
  `notes` text DEFAULT NULL,
  `observations` text DEFAULT NULL,
  `bank_account_id` int(11) DEFAULT NULL,
  `manual_balance_start` decimal(15,2) DEFAULT NULL,
  `manual_balance_end` decimal(15,2) DEFAULT NULL,
  `counted_open` decimal(15,2) DEFAULT NULL,
  `denominations_open` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Contagem por denominação na abertura { "1000": 3, ... }' CHECK (json_valid(`denominations_open`)),
  `denominations_close` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Contagem por denominação no fecho (contagem cega do operador)' CHECK (json_valid(`denominations_close`)),
  `tipo_fechamento` enum('NORMAL','ENTREGA_COFRE','DEPOSITO_BANCARIO','DIVERGENCIA') DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_cash_registers_user_day_company` (`userId`,`opening_date`,`companyId`,`status`),
  KEY `idx_cash_registers_company_status` (`companyId`,`status`),
  KEY `idx_cash_registers_mode_day` (`companyId`,`mode`,`opening_date`),
  KEY `fk_cash_registers_bank_account` (`bank_account_id`),
  CONSTRAINT `fk_cash_registers_bank_account` FOREIGN KEY (`bank_account_id`) REFERENCES `accounts` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cash_registers`
--

LOCK TABLES `cash_registers` WRITE;
/*!40000 ALTER TABLE `cash_registers` DISABLE KEYS */;
INSERT INTO `cash_registers` VALUES (2,36,329,'2026-09-14',0.00,90.00,764150.00,'FECHADO','PHYSICAL',0.00,0.00,0.00,'2026-09-14 17:00:02',329,'2026-09-14 12:07:21','2026-09-15 07:48:20','2026-09-14 12:07:21','2026-09-14 17:00:02',0.00,0.00,90.00,764150.00,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(3,36,329,'2026-09-15',0.00,0.00,0.00,'ABERTO','PHYSICAL',NULL,NULL,NULL,NULL,NULL,'2026-09-15 07:51:23','2026-09-15 07:51:23','2026-09-15 07:51:23',NULL,0.00,0.00,0.00,0.00,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(4,36,329,'2026-09-18',0.00,0.00,0.00,'ABERTO','PHYSICAL',NULL,NULL,NULL,NULL,NULL,'2026-09-18 09:36:26','2026-09-18 09:36:26','2026-09-18 09:36:26',NULL,0.00,0.00,0.00,0.00,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(5,36,329,'2026-09-19',1535.00,0.00,0.00,'FECHADO','PHYSICAL',1.54,1535.00,-1533.46,'2026-09-19 07:33:11',329,'2026-09-19 07:26:16','2026-09-19 07:33:11','2026-09-19 07:26:16','2026-09-19 07:33:11',0.00,0.00,0.00,0.00,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(6,36,329,'2026-09-22',0.00,0.00,0.00,'ABERTO','PHYSICAL',NULL,NULL,NULL,NULL,NULL,'2026-09-22 08:20:20','2026-09-22 08:20:20','2026-09-22 08:20:20',NULL,0.00,0.00,0.00,0.00,NULL,NULL,NULL,NULL,NULL,1535000.00,NULL,NULL,NULL),(7,36,329,'2026-10-04',1535000.00,0.00,0.00,'FECHADO','PHYSICAL',1535000.00,1535000.00,0.00,'2026-10-04 09:18:44',329,'2026-10-04 09:03:49','2026-10-04 09:18:44','2026-10-04 09:03:49','2026-10-04 09:18:44',0.00,0.00,0.00,0.00,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(8,36,329,'2026-10-06',0.00,0.00,0.00,'ABERTO','PHYSICAL',NULL,NULL,NULL,NULL,NULL,'2026-10-06 11:22:31','2026-10-06 11:22:31','2026-10-06 11:22:31',NULL,0.00,0.00,0.00,0.00,NULL,NULL,NULL,NULL,NULL,1535000.00,NULL,NULL,NULL);
/*!40000 ALTER TABLE `cash_registers` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `clientes_microcredito`
--

DROP TABLE IF EXISTS `clientes_microcredito`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `clientes_microcredito` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `tenant_id` int(11) NOT NULL,
  `nome` varchar(255) NOT NULL,
  `tipo_doc` varchar(40) DEFAULT NULL,
  `numero_doc` varchar(100) DEFAULT NULL,
  `data_nascimento` date DEFAULT NULL,
  `sexo` enum('Homem','Mulher','Outro') NOT NULL DEFAULT 'Outro',
  `telefone` varchar(40) DEFAULT NULL,
  `email` varchar(150) DEFAULT NULL,
  `endereco` varchar(255) DEFAULT NULL,
  `provincia` varchar(100) DEFAULT NULL,
  `distrito` varchar(100) DEFAULT NULL,
  `bairro` varchar(100) DEFAULT NULL,
  `sector_actividade` enum('Comércio','Agricultura','Pecuária','Indústria','Serviços','Consumo','Outros') NOT NULL DEFAULT 'Outros',
  `estado` enum('Activo','Inactivo') NOT NULL DEFAULT 'Activo',
  `data_registo` datetime NOT NULL DEFAULT current_timestamp(),
  `criado_por` int(11) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_microclientes_document` (`tenant_id`,`numero_doc`),
  KEY `idx_microclientes_tenant` (`tenant_id`,`estado`),
  KEY `idx_clientes_microcredito_tenant` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `clientes_microcredito`
--

LOCK TABLES `clientes_microcredito` WRITE;
/*!40000 ALTER TABLE `clientes_microcredito` DISABLE KEYS */;
/*!40000 ALTER TABLE `clientes_microcredito` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `collection_activities`
--

DROP TABLE IF EXISTS `collection_activities`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `collection_activities` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `companyId` int(11) NOT NULL,
  `customerId` int(11) DEFAULT NULL,
  `accountNumber` bigint(20) NOT NULL,
  `loanId` int(11) DEFAULT NULL,
  `activityType` varchar(30) NOT NULL,
  `activityDate` datetime NOT NULL DEFAULT current_timestamp(),
  `promisedDate` date DEFAULT NULL,
  `promisedAmount` decimal(15,2) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `latitude` decimal(10,7) DEFAULT NULL,
  `longitude` decimal(10,7) DEFAULT NULL,
  `gpsAccuracy` decimal(10,2) DEFAULT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'REGISTADO',
  `createdBy` int(11) DEFAULT NULL,
  `createdByName` varchar(255) DEFAULT NULL,
  `createdAt` datetime NOT NULL DEFAULT current_timestamp(),
  `updatedAt` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_collection_company` (`companyId`,`activityDate`),
  KEY `idx_collection_account` (`accountNumber`),
  KEY `idx_collection_creator` (`createdBy`,`activityType`),
  KEY `idx_collection_promises` (`promisedDate`,`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `collection_activities`
--

LOCK TABLES `collection_activities` WRITE;
/*!40000 ALTER TABLE `collection_activities` DISABLE KEYS */;
/*!40000 ALTER TABLE `collection_activities` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `companies`
--

DROP TABLE IF EXISTS `companies`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `companies` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `companyName` varchar(255) NOT NULL,
  `companyEmail` varchar(255) NOT NULL,
  `companyWebsite` varchar(255) NOT NULL,
  `companyManager` varchar(255) NOT NULL,
  `smsSender` varchar(45) NOT NULL DEFAULT 'Microcredito',
  `companyNuit` varchar(255) NOT NULL,
  `companyPhone` varchar(255) NOT NULL,
  `districtId` int(11) NOT NULL,
  `provinceId` int(11) NOT NULL,
  `forfeit` int(11) NOT NULL,
  `companyAddress` varchar(255) NOT NULL,
  `companyLogo` varchar(500) DEFAULT '',
  `companyStatus` int(11) NOT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `paymentMethods` mediumtext DEFAULT NULL,
  `smsEnabled` int(11) NOT NULL DEFAULT 1,
  `contractHideInsuranceClause` int(11) NOT NULL DEFAULT 0,
  `approval_status` enum('PENDENTE','APROVADA','REJEITADA','SUSPENSA') NOT NULL DEFAULT 'PENDENTE',
  `nuit` varchar(20) DEFAULT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL,
  `license_number` varchar(100) DEFAULT NULL,
  `plan` enum('STARTER','CRESCIMENTO','PROFISSIONAL') NOT NULL DEFAULT 'CRESCIMENTO',
  `requested_at` datetime DEFAULT current_timestamp(),
  `approved_at` datetime DEFAULT NULL,
  `approved_by` int(11) DEFAULT NULL,
  `rejection_reason` mediumtext DEFAULT NULL,
  `plan_id` int(11) DEFAULT NULL,
  `cash_register_mode` enum('PHYSICAL','ELECTRONIC') NOT NULL DEFAULT 'ELECTRONIC' COMMENT 'Modo de caixa: físico ou electrónico (reconciliação bancária manual)',
  PRIMARY KEY (`id`),
  KEY `fk_companies_district` (`districtId`),
  KEY `fk_companies_province` (`provinceId`),
  CONSTRAINT `fk_companies_district` FOREIGN KEY (`districtId`) REFERENCES `districts` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `fk_companies_province` FOREIGN KEY (`provinceId`) REFERENCES `provinces` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=38 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `companies`
--

LOCK TABLES `companies` WRITE;
/*!40000 ALTER TABLE `companies` DISABLE KEYS */;
INSERT INTO `companies` VALUES (2,'+Mola, Lda','info@maismola.co.mz','https://maismola.co.mz','Leonel Matsinhe','MaisMola','147852654','258870740202',1,1,0,'Distrito Municipal Katembe','https://firebasestorage.googleapis.com/v0/b/microcredito-79408.appspot.com/o/images%2FLogoMaiMola.jpeg?alt=media&token=cacf38ea-22e9-4d26-806d-f05c8ecb029c',1,'2022-10-11 06:37:29','2026-08-13 09:46:15',NULL,1,0,'PENDENTE',NULL,NULL,NULL,NULL,'CRESCIMENTO','2026-09-14 11:43:04',NULL,NULL,NULL,NULL,'ELECTRONIC'),(36,'MBR Microcrédito','microcreditombr@gmail.com','https://www.mbr.co.mz','MBR Microcrédito','MBR','103048273','258842678869',160,1,1,'Bairro de Mukhatine, Q. 4, Casa 4, Avenida de Tintsivene','/documents/9ca20c1ace764d7f3f8e7f32895fef18_IMG-20260903-WA0035.jpg',1,'2025-01-23 21:30:15','2026-10-19 01:18:35',NULL,0,0,'APROVADA',NULL,NULL,NULL,NULL,'CRESCIMENTO','2026-09-14 11:43:04','2026-09-14 11:46:20',15,NULL,2,'ELECTRONIC'),(37,'MicroMz','admin@micromz.com','micromz.com','Leonel ','MicroMz','100000000','258840000000',158,1,1,'24 de Julho','https://firebasestorage.googleapis.com/v0/b/microcredito-79408.appspot.com/o/images%2F1.png?alt=media&token=a9675b2e-5730-4cc2-badf-f513ad110dfa',1,'2025-02-14 08:00:23','2025-02-14 08:00:23',NULL,1,0,'PENDENTE',NULL,NULL,NULL,NULL,'CRESCIMENTO','2026-09-14 11:43:04',NULL,NULL,NULL,NULL,'ELECTRONIC');
/*!40000 ALTER TABLE `companies` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `company_penalty_rules`
--

DROP TABLE IF EXISTS `company_penalty_rules`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `company_penalty_rules` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `company_id` int(11) NOT NULL,
  `forfeit_percent` decimal(5,4) NOT NULL DEFAULT 1.0000,
  `grace_days` int(11) NOT NULL DEFAULT 0,
  `cap_percent` decimal(5,2) NOT NULL DEFAULT 100.00,
  `base` enum('INSTALLMENT','OUTSTANDING_BALANCE') NOT NULL DEFAULT 'INSTALLMENT',
  `business_days_only` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT NULL,
  `max_late_days` int(11) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_penalty_company` (`company_id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `company_penalty_rules`
--

LOCK TABLES `company_penalty_rules` WRITE;
/*!40000 ALTER TABLE `company_penalty_rules` DISABLE KEYS */;
INSERT INTO `company_penalty_rules` VALUES (1,2,0.0000,0,100.00,'OUTSTANDING_BALANCE',0,'2026-10-01 13:08:47',NULL,0),(2,36,1.0000,0,100.00,'OUTSTANDING_BALANCE',0,'2026-10-01 13:08:47',NULL,0),(3,37,1.0000,0,100.00,'OUTSTANDING_BALANCE',0,'2026-10-01 13:08:47',NULL,0);
/*!40000 ALTER TABLE `company_penalty_rules` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `concession_packages`
--

DROP TABLE IF EXISTS `concession_packages`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `concession_packages` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `companyId` int(11) NOT NULL,
  `loanId` int(11) NOT NULL,
  `accountNumber` varchar(255) DEFAULT NULL,
  `customerId` int(11) DEFAULT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'EMITIDO',
  `package_hash` char(64) DEFAULT NULL,
  `storage_dir` varchar(500) DEFAULT NULL,
  `docs` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`docs`)),
  `created_by` int(11) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_concession_loan` (`loanId`),
  KEY `idx_concession_company` (`companyId`,`accountNumber`)
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `concession_packages`
--

LOCK TABLES `concession_packages` WRITE;
/*!40000 ALTER TABLE `concession_packages` DISABLE KEYS */;
INSERT INTO `concession_packages` VALUES (1,36,78,'113',341,'EMITIDO','fde689b4e3d0fc224779cbfea2686107e6a6d73a5bf1bef788bc3dcb27d43c4f','uploads/concessao/36/78','{\"termo\":{\"file\":\"termo-compromisso-conta-113-78.pdf\",\"bytes\":20804,\"hash\":\"ebcbd37dba1581d2a3409b46df6a0c570ee009e173936c463dcd1db642141a03\"},\"garantias\":{\"file\":\"declaracao-garantias-conta-113-78.pdf\",\"bytes\":21117,\"hash\":\"62d6eb309aba7c8e7fb86332831f51da86acc225f2ef171b48eab92a768de6dc\"},\"contrato\":{\"file\":\"contrato-concessao-conta-113-78.pdf\",\"bytes\":38859,\"hash\":\"bf20fa7e04717b64c6fab0b8eba367dba03df26c7ce63106223b629abf5531fe\"},\"plano\":{\"file\":\"plano-inicial-conta-113-78.pdf\",\"bytes\":22447,\"hash\":\"52a081fd5b60c05b602e79103fa797790092bcab4e0021099d2af2fb059db847\"}}',NULL,'2026-10-01 13:09:49','2026-10-01 13:09:49'),(2,36,77,'112',340,'EMITIDO','72a555ca4d1a07068d6de940bfe4b30bb525a2f3b21eb8c8ecf91ef03afaf952','uploads/concessao/36/77','{\"termo\":{\"file\":\"termo-compromisso-conta-112-77.pdf\",\"bytes\":20794,\"hash\":\"d24d9fe1c8db3941786e1c392405c0955a6353b509eaa1beb858b5e0a1c0364a\"},\"garantias\":{\"file\":\"declaracao-garantias-conta-112-77.pdf\",\"bytes\":21120,\"hash\":\"5a94e6693055600df0ee0a2dec44369c998ebf06006d6bf8651e4361e4fc296c\"},\"contrato\":{\"file\":\"contrato-concessao-conta-112-77.pdf\",\"bytes\":38906,\"hash\":\"4fb3e113e8f55ae6b644d6acc77f79271720688938db7168f2f645adc992a4b9\"},\"plano\":{\"file\":\"plano-inicial-conta-112-77.pdf\",\"bytes\":22443,\"hash\":\"1c3a867fca70b6ce18f01dce01e99248a1e54770c6b9e64726c7c8bd78c84351\"}}',NULL,'2026-10-01 13:09:50','2026-10-01 13:09:50'),(3,36,76,'108',336,'EMITIDO','a081c94743356b32bc0a013d362ae73beae4373b75d81dfea72f859307541c60','uploads/concessao/36/76','{\"termo\":{\"file\":\"termo-compromisso-conta-108-76.pdf\",\"bytes\":20804,\"hash\":\"900c84a346d86f442008d00bc325066fc3f536218beea9df56801059b53bdcf9\"},\"garantias\":{\"file\":\"declaracao-garantias-conta-108-76.pdf\",\"bytes\":21119,\"hash\":\"8f9c057a8e8a9c5dde3859119d5c2795bfd13c0390b632e1c02f606d86af4eba\"},\"contrato\":{\"file\":\"contrato-concessao-conta-108-76.pdf\",\"bytes\":38932,\"hash\":\"df3f9cfa58f86aaa7167f317a5347a787b4408fb11eb5b6d525003a540f2d912\"},\"plano\":{\"file\":\"plano-inicial-conta-108-76.pdf\",\"bytes\":22443,\"hash\":\"ffbc3e516e788ae9a406fb2ea7333b48c6a0ac27ab42507d0a5a70f5f0beb76f\"}}',NULL,'2026-10-01 13:09:50','2026-10-01 13:09:50'),(4,36,75,'109',337,'EMITIDO','b453507742c34e178db1593e01863ef17283d3e70f62cb627d7fb3525e3bee13','uploads/concessao/36/75','{\"termo\":{\"file\":\"termo-compromisso-conta-109-75.pdf\",\"bytes\":20792,\"hash\":\"3e087e9f8fa3dc682178f71fcdcf44f90e4a42dae9a16c97118c9dcc117e2b36\"},\"garantias\":{\"file\":\"declaracao-garantias-conta-109-75.pdf\",\"bytes\":21098,\"hash\":\"61b753e0460569e41f657359de4d1743662ee59d892793c877311d8f849bc5f5\"},\"contrato\":{\"file\":\"contrato-concessao-conta-109-75.pdf\",\"bytes\":38843,\"hash\":\"9a2fcaba0be5dbedb7c0f162ded28ddf0702bad53f82262c3cc1020f942562ee\"},\"plano\":{\"file\":\"plano-inicial-conta-109-75.pdf\",\"bytes\":22432,\"hash\":\"5cf43c1d9a45032826e47bd0e607085bc313655a90fddd8e661a89e97c8970fb\"}}',NULL,'2026-10-01 13:09:50','2026-10-01 13:09:50'),(5,36,67,'106',334,'EMITIDO','25415863665eaa9b72d8b7339e7d598a59d3bc13ae375af04387c37b2d89981f','uploads/concessao/36/67','{\"termo\":{\"file\":\"termo-compromisso-conta-106-67.pdf\",\"bytes\":20803,\"hash\":\"c84679feaec97356bd2b5f8a08314e173bf047e02d23f2e812c988c778377555\"},\"garantias\":{\"file\":\"declaracao-garantias-conta-106-67.pdf\",\"bytes\":21308,\"hash\":\"6b1331d2dc4f857548c0f55b880443c95dea73b80736173faf6f6ff76760eb21\"},\"contrato\":{\"file\":\"contrato-concessao-conta-106-67.pdf\",\"bytes\":41018,\"hash\":\"13ac1de54e7752748c0a474730fd761a156799c950c21ea58af18d5b1c037c96\"},\"plano\":{\"file\":\"plano-inicial-conta-106-67.pdf\",\"bytes\":25651,\"hash\":\"f4a67947fa9113a903c47a46b346ab94a4ed5cd0e997c6e0e93f6e29c8098839\"}}',NULL,'2026-10-01 13:09:50','2026-10-01 13:09:50'),(6,36,66,'105',333,'EMITIDO','02232d74f5f5605bc70019343cb0b2d7af0b29455a88e1e15e73b5c1299d238a','uploads/concessao/36/66','{\"termo\":{\"file\":\"termo-compromisso-conta-105-66.pdf\",\"bytes\":20816,\"hash\":\"1c4349d314e6025377563cb7ce6024fa56f6307998b10d0a63f97c74721cba28\"},\"garantias\":{\"file\":\"declaracao-garantias-conta-105-66.pdf\",\"bytes\":21334,\"hash\":\"dfa04498e3acc05da522f2b9b20c577e8f614a996a36fcc2b0f8d16596f466bd\"},\"contrato\":{\"file\":\"contrato-concessao-conta-105-66.pdf\",\"bytes\":41057,\"hash\":\"5dfd85b6bfc4ca6c851d34e278790aa0505c0f9679e6644bb7d2ad742accedbe\"},\"plano\":{\"file\":\"plano-inicial-conta-105-66.pdf\",\"bytes\":25687,\"hash\":\"dd044821fc92d72d6bb470f9767442d96b9db89f0a61f9ba3a3c727f2370baa6\"}}',NULL,'2026-10-01 13:09:51','2026-10-01 13:09:51'),(7,36,63,'102',330,'EMITIDO','c0f3b0e7d07dabff31e3b04e4550510a45a1a328c7c027b97db2da4ff2573a5e','uploads/concessao/36/63','{\"termo\":{\"file\":\"termo-compromisso-conta-102-63.pdf\",\"bytes\":20791,\"hash\":\"41ac870f48b0ffe4bad6be2d15dd7cbd1b180c70e301a669283a0a60dde9c73c\"},\"garantias\":{\"file\":\"declaracao-garantias-conta-102-63.pdf\",\"bytes\":21302,\"hash\":\"5349ccf9a0ac470877657978fd72079d83c9c855da272fc5b9dab3d9a9ad4107\"},\"contrato\":{\"file\":\"contrato-concessao-conta-102-63.pdf\",\"bytes\":40935,\"hash\":\"4fa8ec8f0d54d971f490437e9814139a33ea0ba7a722207a4a11aaf41d1ea7ec\"},\"plano\":{\"file\":\"plano-inicial-conta-102-63.pdf\",\"bytes\":25583,\"hash\":\"675ab822db1a8615ba769698a605e693f3029ef4fe413f83fbc94d7ee2f709d5\"}}',NULL,'2026-10-01 13:09:51','2026-10-01 13:09:51'),(8,36,62,'101',329,'EMITIDO','671eea6fbaa9b39b365fbe8e835be985c9a69c591cb08e6714c088aeabb20be9','uploads/concessao/36/62','{\"termo\":{\"file\":\"termo-compromisso-conta-101-62.pdf\",\"bytes\":20803,\"hash\":\"c1055d1e9813fa368b6f8798a5b88262f74319f57768c597dee93677a0eadac2\"},\"garantias\":{\"file\":\"declaracao-garantias-conta-101-62.pdf\",\"bytes\":21478,\"hash\":\"9a384816df7fc353c1684996e99770a5910bb74aeaf45bb942e0ca102cbb968e\"},\"contrato\":{\"file\":\"contrato-concessao-conta-101-62.pdf\",\"bytes\":41076,\"hash\":\"32f651a85712eb8d46617446b146b3d87b556acaaf406e8f042c079b00f84787\"},\"plano\":{\"file\":\"plano-inicial-conta-101-62.pdf\",\"bytes\":25637,\"hash\":\"c5690baacaefa2f38ee5de4969bebb9101c56885bcb93c5f9fbe1be460a74d72\"}}',NULL,'2026-10-01 13:09:51','2026-10-01 13:09:51'),(9,36,61,'100',328,'EMITIDO','c22ce3cfca5a0806ddfd59c90927fab7ae6b500bde9a4dd15ad1c235022914a3','uploads/concessao/36/61','{\"termo\":{\"file\":\"termo-compromisso-conta-100-61.pdf\",\"bytes\":20787,\"hash\":\"a719e21deffcecd8cdd7f9ff660e769670a08a7afbbc2fe60bb203dd542777b3\"},\"garantias\":{\"file\":\"declaracao-garantias-conta-100-61.pdf\",\"bytes\":21325,\"hash\":\"a6d6269ca3855e47a263233b41274056fee462f07c78343f3f0f11641a5b8062\"},\"contrato\":{\"file\":\"contrato-concessao-conta-100-61.pdf\",\"bytes\":40965,\"hash\":\"42aa635c27a3a2f97910973947d071f6e221059eeb0b41f6912ef90c9433b6b9\"},\"plano\":{\"file\":\"plano-inicial-conta-100-61.pdf\",\"bytes\":25618,\"hash\":\"d2be1e29cac445dfac41cd446fef3ad839a5ffa8eafb999f1e15e73e03c8a299\"}}',NULL,'2026-10-01 13:09:51','2026-10-01 13:09:51');
/*!40000 ALTER TABLE `concession_packages` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `config_microcredito`
--

DROP TABLE IF EXISTS `config_microcredito`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `config_microcredito` (
  `tenant_id` int(11) NOT NULL,
  `taxa_juro_min` decimal(8,4) NOT NULL DEFAULT 0.0000,
  `taxa_juro_max` decimal(8,4) NOT NULL DEFAULT 0.0000,
  `prazo_min` int(11) NOT NULL DEFAULT 1,
  `prazo_max` int(11) NOT NULL DEFAULT 6,
  `capital_inicial` decimal(15,2) NOT NULL DEFAULT 0.00,
  `capital_actual` decimal(15,2) NOT NULL DEFAULT 0.00,
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`tenant_id`),
  KEY `idx_config_microcredito_tenant` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `config_microcredito`
--

LOCK TABLES `config_microcredito` WRITE;
/*!40000 ALTER TABLE `config_microcredito` DISABLE KEYS */;
/*!40000 ALTER TABLE `config_microcredito` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `contract_templates`
--

DROP TABLE IF EXISTS `contract_templates`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `contract_templates` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `companyId` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `type` varchar(50) NOT NULL,
  `subject` varchar(255) DEFAULT NULL,
  `content` longtext NOT NULL,
  `variables` text DEFAULT NULL,
  `isDefault` int(11) NOT NULL DEFAULT 0,
  `status` int(11) NOT NULL DEFAULT 1,
  `createdAt` datetime DEFAULT NULL,
  `updatedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `contract_templates`
--

LOCK TABLES `contract_templates` WRITE;
/*!40000 ALTER TABLE `contract_templates` DISABLE KEYS */;
/*!40000 ALTER TABLE `contract_templates` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `creditos`
--

DROP TABLE IF EXISTS `creditos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `creditos` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `tenant_id` int(11) NOT NULL,
  `cliente_id` int(11) NOT NULL,
  `codigo` varchar(40) NOT NULL,
  `montante_capital` decimal(15,2) NOT NULL,
  `taxa_juro_mensal` decimal(8,4) NOT NULL,
  `prazo_meses` int(11) NOT NULL,
  `data_concessao` date NOT NULL,
  `data_vencimento` date NOT NULL,
  `sector_finalidade` enum('Comércio','Agricultura','Pecuária','Indústria','Serviços','Consumo','Outros') NOT NULL DEFAULT 'Outros',
  `estado` enum('Vigente','Reembolsado','Em_Risco','Abatido','Atrasado') NOT NULL DEFAULT 'Vigente',
  `capital_em_divida` decimal(15,2) NOT NULL DEFAULT 0.00,
  `juro_em_divida` decimal(15,2) NOT NULL DEFAULT 0.00,
  `total_em_divida` decimal(15,2) NOT NULL DEFAULT 0.00,
  `juros_total` decimal(15,2) NOT NULL DEFAULT 0.00,
  `capital_abatido` decimal(15,2) NOT NULL DEFAULT 0.00,
  `juro_abatido` decimal(15,2) NOT NULL DEFAULT 0.00,
  `data_abatimento` date DEFAULT NULL,
  `dias_atraso` int(11) NOT NULL DEFAULT 0,
  `classe_risco` enum('I','II','III','IV') DEFAULT NULL,
  `data_ultimo_pagamento` date DEFAULT NULL,
  `agente_id` int(11) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_microcredit_code` (`tenant_id`,`codigo`),
  KEY `idx_microcredit_tenant_status` (`tenant_id`,`estado`),
  KEY `idx_microcredit_period` (`tenant_id`,`data_concessao`),
  KEY `fk_microcredit_client` (`cliente_id`),
  KEY `idx_creditos_tenant` (`tenant_id`),
  CONSTRAINT `fk_microcredit_client` FOREIGN KEY (`cliente_id`) REFERENCES `clientes_microcredito` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `creditos`
--

LOCK TABLES `creditos` WRITE;
/*!40000 ALTER TABLE `creditos` DISABLE KEYS */;
/*!40000 ALTER TABLE `creditos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `customer_credits`
--

DROP TABLE IF EXISTS `customer_credits`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `customer_credits` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `company_id` int(11) NOT NULL,
  `customer_id` int(11) NOT NULL,
  `account_number` int(11) NOT NULL,
  `amount` decimal(15,2) NOT NULL,
  `remaining_amount` decimal(15,2) NOT NULL,
  `source_payment_id` int(11) DEFAULT NULL,
  `status` enum('ACTIVE','APPLIED','CANCELLED') NOT NULL DEFAULT 'ACTIVE',
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_credit_customer` (`company_id`,`account_number`,`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `customer_credits`
--

LOCK TABLES `customer_credits` WRITE;
/*!40000 ALTER TABLE `customer_credits` DISABLE KEYS */;
/*!40000 ALTER TABLE `customer_credits` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `customer_documents`
--

DROP TABLE IF EXISTS `customer_documents`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `customer_documents` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `companyId` int(11) NOT NULL,
  `accountNumber` int(11) NOT NULL,
  `documentName` varchar(255) NOT NULL,
  `documentFileUrl` varchar(255) NOT NULL,
  `uploadedBy` varchar(255) NOT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `customerId` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_documents_customer` (`customerId`),
  CONSTRAINT `fk_documents_customer` FOREIGN KEY (`customerId`) REFERENCES `customers` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=94 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `customer_documents`
--

LOCK TABLES `customer_documents` WRITE;
/*!40000 ALTER TABLE `customer_documents` DISABLE KEYS */;
INSERT INTO `customer_documents` VALUES (60,36,100,'BI / Passaporte / Carta de condução','/documents/67fca1c5a1d3a9754c62d9619579cc1a_Avelino BI.jpg','Eliana Munguambe','2026-09-01 13:20:15','2026-09-01 13:20:15',328),(61,36,100,'NUIT','/documents/b4b2f48952af4a1c00e27413256e46cb_AvelinoNuit.jpg','Eliana Munguambe','2026-09-01 13:20:32','2026-09-01 13:20:32',328),(62,36,100,'Declaração do bairro','/documents/f60b59815eee7c01b5a093f31c3252b1_AvelinoDeclaração.jpg','Eliana Munguambe','2026-09-01 13:20:45','2026-09-01 13:20:45',328),(63,36,101,'BI / Passaporte / Carta de condução','/documents/0c0c577ba091011edbca3104eb612576_BartolomeuBI.jpg','Eliana Munguambe','2026-09-01 13:32:08','2026-09-01 13:32:08',329),(64,36,101,'NUIT','/documents/34b83f0ee82e4ae51f2aafcb3bd5f5ff_BartolomeuNUIT.jpg','Eliana Munguambe','2026-09-01 13:32:18','2026-09-01 13:32:18',329),(65,36,101,'Declaração do bairro','/documents/35b36c43a304f44fc65678032a575430_DeclaracaoBartolomeu.jpg','Eliana Munguambe','2026-09-01 13:32:28','2026-09-01 13:32:28',329),(66,36,102,'BI / Passaporte / Carta de condução','/documents/941dfbadd400e23004cb8d7de2140783_CarlitosBI.jpg','Eliana Munguambe','2026-09-01 13:44:28','2026-09-01 13:44:28',330),(67,36,102,'NUIT','/documents/a67b9df26a6ef33b6be5f2c3f4fb57f2_CarlitosNuit.jpg','Eliana Munguambe','2026-09-01 13:44:37','2026-09-01 13:44:37',330),(68,36,102,'Declaração do bairro','/documents/88a1655d743e91971d56e96c5957d8b0_CarlitosDeclaracao.jpg','Eliana Munguambe','2026-09-01 13:44:50','2026-09-01 13:44:50',330),(69,36,105,'BI / Passaporte / Carta de condução','/documents/f1b982f7bfd34f3bc5332ebf05d16a71_MarcelinoBI.jpg','Eliana Munguambe','2026-09-01 14:20:57','2026-09-01 14:20:57',333),(70,36,105,'NUIT','/documents/1181be31f9b773b210aeeaf9c9659b1e_MarcelinoNuit.jpg','Eliana Munguambe','2026-09-01 14:21:08','2026-09-01 14:21:08',333),(71,36,105,'Declaração do bairro','/documents/1f1bade32ee7c0f6a95e817a31713558_MarcelinoDeclaracao.jpg','Eliana Munguambe','2026-09-01 14:21:20','2026-09-01 14:21:20',333),(72,36,106,'BI / Passaporte / Carta de condução','/documents/655963fbf14ec8cdc7fdb441524caf91_SaideBI.jpg','Eliana Munguambe','2026-09-01 14:28:59','2026-09-01 14:28:59',334),(73,36,106,'NUIT','/documents/621e462353f0de9b02d07c72ef0ceb2c_SaideNUIT.jpg','Eliana Munguambe','2026-09-01 14:29:10','2026-09-01 14:29:10',334),(74,36,106,'Declaração do bairro','/documents/95a0c3f2f8e81c2154617f2142178ee9_SaideDeclaração.jpg','Eliana Munguambe','2026-09-01 14:29:21','2026-09-01 14:29:21',334),(75,36,107,'BI / Passaporte / Carta de condução','/documents/f06e6b0f5108ddaaecdb6e13dbe31b03_SergioBI.jpg','Eliana Munguambe','2026-09-01 14:37:56','2026-09-01 14:37:56',335),(76,36,107,'NUIT','/documents/b91c76952524aacbdfec8f740168b3fa_SergioNuit.jpg','Eliana Munguambe','2026-09-01 14:38:07','2026-09-01 14:38:07',335),(77,36,107,'Declaração do bairro','/documents/ee35fb436bb41b4e9fb9cdebb6b67841_SergioDeclaracao.jpg','Eliana Munguambe','2026-09-01 14:38:18','2026-09-01 14:38:18',335),(78,36,104,'BI / Passaporte / Carta de condução','/documents/3cf4e16388e50485e95aa9f7f61f7417_BI.jpg','Iracema Muhuai','2026-09-02 06:17:12','2026-09-02 06:17:12',332),(79,36,104,'NUIT','/documents/9dc40e108cdc0fa2bbea2e810580afde_NUIT.jpg','Iracema Muhuai','2026-09-02 06:17:33','2026-09-02 06:17:33',332),(80,36,104,'Declaração do bairro','/documents/74d82545b6a077f8b955f89d44bf3b8c_Declaracao Bairro.jpg','Iracema Muhuai','2026-09-02 06:17:50','2026-09-02 06:17:50',332),(81,36,108,'BI / Passaporte / Carta de condução','/documents/1333b4b40a315f19dc35a37dbf32edab_WhatsApp Image 2026-09-09 at 12.47.51.jpeg','Iracema Mahuai','2026-09-09 12:20:17','2026-09-09 12:20:17',336),(82,36,108,'NUIT','/documents/0beaf52cbf8bda67c6feae81f055df4b_2NUIT_024536.pdf','Iracema Mahuai','2026-09-09 12:21:18','2026-09-09 12:21:18',336),(83,36,108,'Alvará','/documents/684e834d84f21f014c462624b0bc436b_alvara certidao nr conta_032726.pdf','Iracema Mahuai','2026-09-09 12:49:02','2026-09-09 12:49:02',336),(84,36,114,'BI / Passaporte / Carta de condução','/documents/e4feaec4a6fe037efa391f87426d12f6_BI Vasco .pdf','Eliana Munguambe','2026-09-29 10:10:43','2026-09-29 10:10:43',342),(85,36,114,'NUIT','/documents/fde238dbff4c539c90c3d0aa6ef0db97_2022_10_27 13_03 Office Lens.pdf','Eliana Munguambe','2026-09-29 10:12:52','2026-09-29 10:12:52',342),(86,36,114,'Comprovativo de rendimentos','/documents/525299660e8cdd8f4a8f2247679e12ee_WhatsApp Image 2026-09-29 at 12.14.10 PM.jpeg','Eliana Munguambe','2026-09-29 10:14:34','2026-09-29 10:14:34',342),(87,36,108,'Comprovativo de rendimentos','/documents/6ccb7a3bcb2570fe33b716a54af32221_GISLENE.jpeg','Iracema Mahuai','2026-10-06 07:36:50','2026-10-06 07:36:50',336),(89,36,115,'BI / Passaporte / Carta de condução','/documents/cfcf6fd9d4f30d740e5c9843311c8c21_IMG_20260318_155935_769.jpg','Iracema Mahuai','2026-10-12 13:59:09','2026-10-12 13:59:09',343),(91,36,115,'Declaração do bairro','/documents/65832b875c82c5fd28612a4c47c73d14_IMG_20260318_160028_958.jpg','Iracema Mahuai','2026-10-12 14:00:05','2026-10-12 14:00:05',343),(92,36,115,'NUIT','/documents/c97bb8d10095aac290afb958dacaa0c0_IMG_20260318_155954_436.jpg','Iracema Mahuai','2026-10-12 14:01:02','2026-10-12 14:01:02',343),(93,36,115,'Comprovativo de rendimentos','/documents/a366e91f0b1725785da69e7233440e63_Ricardina.jpeg','Eliana Munguambe','2026-10-12 15:34:19','2026-10-12 15:34:19',343);
/*!40000 ALTER TABLE `customer_documents` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `customer_loans`
--

DROP TABLE IF EXISTS `customer_loans`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `customer_loans` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `companyId` int(11) NOT NULL,
  `creditManager` int(11) NOT NULL,
  `accountNumber` int(11) NOT NULL,
  `amount` decimal(15,2) NOT NULL,
  `numberOfInstallments` int(11) NOT NULL,
  `interestRate` decimal(8,4) NOT NULL,
  `loanDescription` longtext NOT NULL,
  `dateCreated` varchar(20) NOT NULL,
  `status` varchar(20) NOT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `capacityExcessObservation` text DEFAULT NULL,
  `borrowerInfo` text DEFAULT NULL,
  `administrativeFee` decimal(15,6) NOT NULL DEFAULT 0.000000,
  `disbursementDate` varchar(255) DEFAULT NULL,
  `customerId` int(11) DEFAULT NULL,
  `walletId` int(11) DEFAULT NULL,
  `approvalState` varchar(30) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `id_UNIQUE` (`id`),
  KEY `idx_customer_loans_company_status_date` (`companyId`,`status`,`dateCreated`),
  KEY `idx_customer_loans_company_manager_status` (`companyId`,`creditManager`,`status`),
  KEY `idx_customer_loans_accountNumber` (`accountNumber`),
  KEY `fk_loans_customer` (`customerId`),
  KEY `idx_customer_loans_walletId` (`walletId`),
  CONSTRAINT `fk_loans_company` FOREIGN KEY (`companyId`) REFERENCES `companies` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `fk_loans_customer` FOREIGN KEY (`customerId`) REFERENCES `customers` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `fk_loans_wallet` FOREIGN KEY (`walletId`) REFERENCES `financing_wallets` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=80 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `customer_loans`
--

LOCK TABLES `customer_loans` WRITE;
/*!40000 ALTER TABLE `customer_loans` DISABLE KEYS */;
INSERT INTO `customer_loans` VALUES (61,36,353,100,100000.00,18,0.0200,'Conforme análise documental e declaração de rendimentos, a margem de lucro mensal apurada é de 50.640,00 MT, e acreditamos que com o valor solicitado, e por sabermos que o cliente dispõe de outros rendimentos não declarados (referentes ao seu salário), o negócio  poderá gerar um lucro superior em relação ao que gera actualmente sem nenhum empréstimo.','2026-09-02','1','2026-09-02 13:25:12','2026-09-14 13:50:41',NULL,'{\"finalidade\":\"Comercio\",\"garantia\":\"Ema mercearia localizada no bairro de mutiticoma, perto do Frank. (190 000,00 MT)\",\"seguroVida\":\"Sim\",\"capitalSeguro\":\"100 000,00 MT\",\"seguroBem\":\"Não\",\"beneficiario\":\"MBR Microcrédito até ao saldo devedor\"}',0.000000,'2026-09-03',328,11,'DESEMBOLSADO'),(62,36,353,101,90000.00,18,0.0900,'As garantias oferecidas são sólidas e parecem superar o valor do crédito. A propria loja comercial, objecto de investimento, e imóvel residencial, ambos com documentação regular.','2026-09-02','1','2026-09-02 13:25:12','2026-09-14 13:51:10','Conforme análise documental e declaração de rendimentos, a margem de lucro mensal apurada é de 29.000,00 MT, e acreditamos que com o valor solicitado, o negócio  poderá gerar um lucro superior em relação ao que gera actualmente sem nenhum empréstimo.','{\"finalidade\":\"Comercio\",\"garantia\":\"A loja comercial feita a blocos (mercearia) (2,00 MT), Uma residência tipo 2, localizada em Larde, no bairro de Maganha perto do rio Maganha (200 000,00 MT)\",\"seguroVida\":\"Sim\",\"capitalSeguro\":\"90 000,00 MT\",\"seguroBem\":\"Não\",\"beneficiario\":\"MBR Microcrédito até ao saldo devedor\"}',0.000000,'2026-09-03',329,11,'DESEMBOLSADO'),(63,36,353,102,20000.00,18,0.0200,'Proponente com experieência operacional validada. Já actua no mercado, reduzindo o risco de implementaçã do negócio. Cartela de clientes garantida, demanda já existente.','2026-09-02','1','2026-09-02 13:25:12','2026-09-14 13:51:35',NULL,'{\"finalidade\":\"Comercio\",\"garantia\":\"A sua residencia feita de material precario (30 000,00 MT)\",\"seguroVida\":\"Sim\",\"capitalSeguro\":\"20 000,00 MT\",\"seguroBem\":\"Não\",\"beneficiario\":\"MBR Microcrédito até ao saldo devedor\"}',0.000000,'2026-09-03',330,11,'DESEMBOLSADO'),(66,36,353,105,300000.00,18,0.0200,'É um cliente com uma certa experiência no ramo que pretende investir, visto que trabalha com o mesmo negócio há um tempo.','2026-09-02','1','2026-09-02 13:25:12','2026-09-14 13:52:03','Conclui-se pela viabilidade financeira, o baixo risco da operação, tendo em conta o crédito solicitado. O cliente demonstra comprometimento com o projeto e coloca como garantia um carro Toyota Alphard, AML 485 MC, na cor branca.','{\"finalidade\":\"Talho\",\"garantia\":\"Um carro Toyota Alphard, AML 485 MC, na cor branca (900 000,00 MT)\",\"seguroVida\":\"Sim\",\"capitalSeguro\":\"300 000,00 MT\",\"seguroBem\":\"Não\",\"beneficiario\":\"MBR Microcrédito até ao saldo devedor\"}',0.000000,'2026-09-03',333,11,'DESEMBOLSADO'),(67,36,353,106,150000.00,18,0.0200,'Aprovamos o credito de 150.000,00 MT ao sr Saide Ali Fargi considerando a consistencia que o negocio apresenta, o rendimento mensal e de 40.350,00 MT.','2026-09-02','1','2026-09-02 13:25:12','2026-09-14 13:53:43',NULL,'{\"finalidade\":\"Comercio\",\"garantia\":\"Uma mercearia localizada no bairro de Tipane (130 000,00 MT)\",\"seguroVida\":\"Sim\",\"capitalSeguro\":\"150 000,00 MT\",\"seguroBem\":\"Não\",\"beneficiario\":\"MBR Microcrédito até ao saldo devedor\"}',0.000000,'2026-09-03',334,11,'DESEMBOLSADO'),(68,36,353,107,350000.00,18,0.0200,'Conforme a nossa análise trata-se de um investimento em expansão de atividade já rentável e consolidada. Conclui-se pela viabilidade financeira e baixo risco da operação tendo em conta o crédito solicitado.Trata-se de um cliente com perfil investidor, que já dispõe de capital inicial próprio para aquisição do veículo destinado a atividade de transporte. Esta estrutura reduz significativamente o risco da operação, pois demonstra comprometimento do cliente com o projeto e entrada imediata do bem como garantia real.','2026-09-02','0','2026-09-02 13:25:12','2026-09-14 13:45:52','De acordo com a análise de viabilidade do projeto, considera-se que o plano de negócio apresentado por este cliente é consistente e o empreendimento tem capacidade de gerar fluxo de caixa suficiente para honrar as prestações dentro do prazo contratado. O cliente apresenta capacidade de faturamento que varia de 60.000,00 MT a 75.000,00 MT mensalmente dependendo do fluxo do trabalho. A finalidade deste crédito é de investir na compra de uma viatura para exercer as actividades de transporte de passageiros e mercadorias. A viatura consiste numa das garantias apresentadas. O risco é baixo visto que é um cliente experiente na área que pretende trabalhar.','{\"finalidade\":\"Transporte de Carga e de passageiros\",\"garantia\":\"A parte frontal de uma casa tipo 2, com dois quartos e sala, 1 cozinha, casa de banho interna e uma varanda. (900 000,00 MT)\",\"seguroVida\":\"Sim\",\"capitalSeguro\":\"350 000,00 MT\",\"seguroBem\":\"Não\",\"beneficiario\":\"MBR Microcrédito até ao saldo devedor\"}',0.000000,NULL,335,11,'AGUARDANDO_APROVACAO'),(69,36,354,104,350000.00,7,0.0200,' Concedemos o emprestimo de 1000.000,00 MT em regime de conta corrente caussionada, onde o sr Jacob vai receber numa primeira fase, 350.000,00 MT para pagar uma prestação de 54.079,18 MT de acordo com a sua capacidade.Neste contexto, se ele conseguir pagar o valor concedido em 7 meses, o MBRM  irá desembolsar o valor remanescente de 650.000,00 MT e a prestação mensal passará a ser de 50.026,58 MT. Recomendamos que o cliente constitua um fundo de emergência no montante de 5.000,00 MT ao mês por tempo indeterminado.\n','2026-09-03','0','2026-09-03 10:25:13','2026-09-14 13:45:43','Aprovamos o credito, considerando os seus empreendimentos e garantias, achamos que este cliente pode possuir rendimentos não declarados.capacidade.','{\"finalidade\":\"Padaria/Pastelaria\",\"garantia\":\"Gerador industrial de 40KVA, segunda mão (455 000,00 MT)\",\"seguroVida\":\"Sim\",\"capitalSeguro\":\"350 000,00 MT\",\"seguroBem\":\"Não\",\"beneficiario\":\"MBR Microcrédito até ao saldo devedor\"}',0.000000,NULL,332,11,'AGUARDANDO_APROVACAO'),(74,36,329,104,650000.00,11,0.0200,'Comércio','2026-09-14','0','2026-09-14 14:00:15','2026-09-14 14:00:15','Alavancagem do negócio de padaria e pastelaria',NULL,0.000000,NULL,332,11,'AGUARDANDO_APROVACAO'),(75,36,329,109,90000.00,1,0.0800,'Outro','2026-09-10','1','2026-09-14 14:18:16','2026-09-14 14:34:26','Desembolso de 90 mil meticais efectuados no dia 10 de Setembro de 2026',NULL,0.000000,'2026-09-14',337,14,'DESEMBOLSADO'),(76,36,329,108,7500.00,1,0.0800,'Outro','2026-09-11','1','2026-09-14 14:55:25','2026-09-14 14:56:28',NULL,NULL,0.000000,'2026-09-11',336,14,'DESEMBOLSADO'),(77,36,329,112,1000.00,1,0.0800,'Outro','2026-09-14','1','2026-09-14 15:04:20','2026-09-14 15:05:41',NULL,NULL,0.000000,'2026-09-11',340,14,'DESEMBOLSADO'),(78,36,354,113,5650.00,1,0.0800,'Outro','2026-09-11','1','2026-09-14 15:18:05','2026-09-14 15:27:15',NULL,NULL,0.000000,'2026-09-11',341,14,'DESEMBOLSADO'),(79,36,354,115,200000.00,18,0.0900,'Outro','2026-10-12','0','2026-10-12 15:43:47','2026-10-12 15:43:47','[Garantia adicional apresentada pelo mutuário] Cliente com capacidade de pagamento comprovada, com fluxo de caixa sazonal.\n Trata-se de uma cliente sólida experiência no ramo, atuando no mesmo negócio há anos, no qual consolidou o seu patrimônio. A nálise de viabilidade financeira indica baixo risco da operacional para o crédito solicitado. A cliente demonstra comprometimento com a atividade e oferece próprio patrimônio empresarial como garantia. (parecer: /documents/0ed836f42abbd7d11f147e75b6529bc3_Parecer Ricardina.pdf)',NULL,0.000000,NULL,343,11,'AGUARDANDO_APROVACAO');
/*!40000 ALTER TABLE `customer_loans` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `customers`
--

DROP TABLE IF EXISTS `customers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `customers` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `companyId` int(11) NOT NULL,
  `accountNumber` int(11) NOT NULL,
  `password` varchar(255) NOT NULL,
  `customerName` varchar(255) NOT NULL,
  `sex` varchar(255) DEFAULT NULL,
  `customerEmail` varchar(255) DEFAULT NULL,
  `customerNuit` varchar(255) DEFAULT NULL,
  `customerPhone` varchar(255) DEFAULT NULL,
  `customerNationalId` varchar(255) DEFAULT NULL,
  `issuedAt` varchar(255) DEFAULT NULL,
  `localOfIssue` varchar(255) DEFAULT NULL,
  `customerDateOfBirth` varchar(255) DEFAULT NULL,
  `customerMonthlySalary` varchar(255) DEFAULT NULL,
  `customerAddress` varchar(255) DEFAULT NULL,
  `customerProfession` varchar(255) DEFAULT NULL,
  `customerLocalOfWork` varchar(255) DEFAULT NULL,
  `maritalStatus` varchar(255) DEFAULT NULL,
  `customerSpouseName` varchar(255) DEFAULT NULL,
  `customerSpouseContact` varchar(255) DEFAULT NULL,
  `customerEmergencyPerson` varchar(255) DEFAULT NULL,
  `customerEmergencyContact` varchar(255) DEFAULT NULL,
  `passportPhotoUrl` varchar(255) DEFAULT NULL,
  `customerStatus` int(11) NOT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `customerBairro` varchar(255) DEFAULT NULL,
  `customerPPE` int(11) DEFAULT 0,
  `credentialsSent` int(11) DEFAULT 0,
  `credentialsSentAt` varchar(255) DEFAULT NULL,
  `interestRateId` int(11) DEFAULT NULL,
  `isSelfRegistered` int(11) NOT NULL DEFAULT 0,
  `customerType` enum('PF','PJ') NOT NULL DEFAULT 'PF',
  `companyLegalRepresentative` varchar(255) DEFAULT NULL,
  `companyRepresentativeIdNumber` varchar(255) DEFAULT NULL,
  `companyRepresentativeIdExpiry` varchar(255) DEFAULT NULL,
  `companyRepresentativeIdIssuer` varchar(255) DEFAULT NULL,
  `companyLicenseNumber` varchar(255) DEFAULT NULL,
  `companyMainActivity` varchar(255) DEFAULT NULL,
  `creditManager` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_customers_company_account` (`companyId`,`accountNumber`),
  KEY `idx_customers_company_phone` (`companyId`,`customerPhone`),
  KEY `fk_customers_interest_rate` (`interestRateId`),
  CONSTRAINT `fk_customers_interest_rate` FOREIGN KEY (`interestRateId`) REFERENCES `interest_rates` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=347 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `customers`
--

LOCK TABLES `customers` WRITE;
/*!40000 ALTER TABLE `customers` DISABLE KEYS */;
INSERT INTO `customers` VALUES (328,36,100,'$2a$10$rD7ffbYJK11QLwnZoSEv8uk.nc/nffH/RVIljKZvvBudJAMTO4OMK','Adelino Albino Ali','M','','145764211','258860168491','0301065159986S','21/11/2022','Cidade de Nampula','17/10/1998','27400','Topuito','Professor','Escola Secundaria de Topuito','solteiro','','','Muaija Albino Ali','258861899785',NULL,1,'2026-09-01 13:15:47','2026-09-01 14:02:28','Mutiticoma',0,0,NULL,NULL,0,'PF',NULL,NULL,NULL,NULL,NULL,NULL,353),(329,36,101,'$2a$10$RtO6nHY7r5z4wxiikm9V6e0VHQFJKAhOurrdDxRhd9xsSDbTkQi4G','Bartolomeu Alfredo Vasco','M','','173063334','258870439498','32208868206I','07/05/2022','Cidade de Nampula','11/05/1990','29000','Larde','Comerciante','Conta propria','solteiro','','','Antonio Lourenco','258873810869',NULL,1,'2026-09-01 13:30:23','2026-09-01 13:30:23','Maganha',0,0,NULL,NULL,0,'PF',NULL,NULL,NULL,NULL,NULL,NULL,353),(330,36,102,'$2a$10$9txrnEilFkS8blFfTatAsOyXTHho8flGJx27hTNbeCaxDbjy2qpCe','Carlitos Joao Celestino','M','','164231518','258870509734','031006604185N','08/06/2023','Cidade de Nampula','03/05/1980','9750','Topuito','Camponês','Conta própria','solteiro','','','Assia Paulino','258860101215',NULL,1,'2026-09-01 13:42:55','2026-09-01 13:42:55','Mutiticoma',0,0,NULL,NULL,0,'PF',NULL,NULL,NULL,NULL,NULL,NULL,353),(331,36,103,'$2a$10$jpKXduX2xeFOiV2SjOjUWuQUIdhtz9p8daCN.b3RFH/az6Be2UAdS','Carlos Agostinho Momade','M','','175853091','258844432569','031208868091I','20/03/2020','Cidade de Nampula','16/05/1997','12000','Topuito','Motorista de Moto','Conta própria','solteiro','','','Nuro','258864361451',NULL,1,'2026-09-01 13:55:19','2026-09-01 13:55:19','Mutiticoma',0,0,NULL,NULL,0,'PF',NULL,NULL,NULL,NULL,NULL,NULL,NULL),(332,36,104,'$2a$10$bsOuB2BoY4J2yiBcBmM4CuIWS5A75dXru.LDiUWz5RzI9xQZPEjja','Jacob Nafital Novela','M','novelajacob@gmail.com','102490096','258846548340','100100913461A','18/09/2025','Cidade de Nampula','03/06/1975','59174','Topuito','Conta propria','Conta propria','solteiro','','','Isabel Taulane','258846153857',NULL,1,'2026-09-01 14:01:58','2026-09-01 14:01:58','Mutiticoma',0,0,NULL,NULL,0,'PF',NULL,NULL,NULL,NULL,NULL,NULL,354),(333,36,105,'$2a$10$5q4U0.xrp35Wta/0qddete48RgFkrj0lfoUT/PqS6bQ9OHReqrhre','Marcelino Horacio Jose da Silva','M','','120261347','258847836358','030100999478A','10/09/2021','Cidade de Nampula','16/06/199','24000','Topuito','Comerciante','Kenmare','solteiro','','','Lurdes Joao Sequela','258847055716',NULL,1,'2026-09-01 14:18:26','2026-09-01 14:18:26','Mutiticoma',0,0,NULL,NULL,0,'PF',NULL,NULL,NULL,NULL,NULL,NULL,353),(334,36,106,'$2a$10$8z/8zNGnmRjmP.o2H4eqy.1WHZuS6SXFa0UmMBymFe4Ks73BFSQHq','Saide Ali Fargi','M','saidealifargi755@gmail.com','111127301','258845857914','110200360007C','05/04/2021','Cidade de Nampula','14/06/1984','40350','Topuito','Operador de perfuração','Kenmare','solteiro','','','Zaida Albano','258863998004',NULL,1,'2026-09-01 14:27:39','2026-09-01 14:27:39','Mutiticoma',0,0,NULL,NULL,0,'PF',NULL,NULL,NULL,NULL,NULL,NULL,353),(335,36,107,'$2a$10$yFKgGXPhVlpluKHVpVl7JuQYsm/6k3x6VaeGTrLp2uI2G5eYThpYi','Sergio Zacarias Cossa','M','','111689253','258846744269','110200572828F','09/072021','Cidade de Nampula','02/04/1978','59500','Topuito','Motorista','Conta própria','solteiro','','','Helia Tome','258851489618',NULL,1,'2026-09-01 14:36:42','2026-09-01 14:36:42','Mutiticoma',0,0,NULL,NULL,0,'PF',NULL,NULL,NULL,NULL,NULL,NULL,353),(336,36,108,'$2a$10$.Z0GCY0WWKU7fn6Y6N.BVe3U2/Bpil4hwuHfYnAVq08KORbN7AWyi','Gislene Teresa Majande','F','gisleneteresa0611@gmail.com','151882765','258841274440','100106016868J','2022-12-01','Cidade de Maputo','2007-11-06','30235','Q. 39 Casa 5047 - Matola','Bancária','Maputo','solteiro','Arménia Felisberto M. Machatine','844987252','Nelsa Carménia','258825840547',NULL,1,'2026-09-09 12:01:43','2026-09-14 14:54:30','Tsalala',0,0,NULL,NULL,0,'PF',NULL,NULL,NULL,NULL,NULL,NULL,329),(337,36,109,'$2a$10$Vr48qIbYcAHvSRjODhPag.ONxUNgMwp/J4F97I.8FPXPIhb/66j7u','Eliana Munguambe','F','munguambe.eliana@gmail.com','101003094','842678869','110100123503I','2017-06-06','Maputo','1971-03-20','418000','Av. do Brasil','Bancaria','MBRM','solteiro','','','Aleluia','824975795',NULL,1,'2026-09-11 12:51:06','2026-09-11 12:57:07','',0,0,NULL,NULL,0,'PF',NULL,NULL,NULL,NULL,NULL,NULL,329),(338,36,110,'$2a$10$d6gKNEtxn0JxCFlYwp.1TeZM2ps8bux.i7lKKTbD3O7e4i6sTNVWe','Mujuane Mucussete Muquirimane','M','','152046065','862844620','3010262647S','2022-02-08','Cidade de Nampula','1981-12-10','46000','Larde-Nathere','Comerciante','Nathere','solteiro','','','Assane Suleimane','871265595',NULL,1,'2026-09-11 12:53:30','2026-09-11 13:07:20','Nathere',0,0,NULL,NULL,0,'PF',NULL,NULL,NULL,NULL,NULL,NULL,NULL),(339,36,111,'$2a$10$Zy7Ug82jFSsst0LhznVgae/e5.nKpFFrM/wRhvdCCkJn7vYDyG3Nm','MAKS CONSTRUCOES SOC UNIPESSOAL LTD',NULL,'mauromachatine@gmail.com','400851468','258847135279',NULL,NULL,NULL,NULL,'28000','Maputo-Matola, Q.36 casa 19, 1˚de Maio',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,'2026-09-14 14:15:17','2026-09-14 14:15:17',NULL,0,0,NULL,NULL,0,'PJ','Mauro Neto Machatine','110102261820N','2021-11-05','Cidade de Maputo','77/OP2/031C/24','Construção',NULL),(340,36,112,'$2a$10$.3LpdpjdybTB1mZE2lQ3VeLw7Sz73Czs9EJPlVZTslEq4OClBW2ue','Aleluia Adelaide Munguambe','F','aleluiamunguambe@gmail.com','139017633','258852843963','110108899036N','2024-10-08','Cidade de Maputo','2006-08-24','19000','Q. 30 Casa 31 - Matola','Bancária','MBR Microcrédito','solteiro','','','Eliana Leia','258842678869',NULL,1,'2026-09-14 15:03:48','2026-09-14 15:03:48','Tchumene',0,0,NULL,NULL,0,'PF',NULL,NULL,NULL,NULL,NULL,NULL,329),(341,36,113,'$2a$10$4oimkx2ka0H6a622aASk2eqNewqs4Q1Df1DFIr.gIsrKZTASstcBW','Mauro Neto Machatine','M','mauromachatine@gmail.com','107279911','258847135279','110102261820N','2021-11-05','Cidade de Maputo','1979-01-19','100251.78','Q.36 casa 19 ','Bancario','MBR Microcrédito','casado','Armenia Munguambe Machatine','25874952488','Catolica Munguambe','25843737402',NULL,1,'2026-09-14 15:15:41','2026-09-14 15:26:07','1 de Maio',0,0,NULL,NULL,0,'PF',NULL,NULL,NULL,NULL,NULL,NULL,354),(342,36,114,'$2a$10$OAql8ytk80b60eg4Wu/UBO.Ph7cW2uj7003TR9QlonnIAgJOO8m6G','Vasco Matsinhe','M','','115369385','258842647094','11010290586P','2025-03-21','Cidade de Maputo','1998-04-06','37120','Q. 23, Casa 1521','IT','MBRM','solteiro','','','Dário Bicicleta','258829350816',NULL,1,'2026-09-29 10:08:31','2026-09-29 10:08:31','Matola',0,0,NULL,NULL,0,'PF',NULL,NULL,NULL,NULL,NULL,NULL,NULL),(343,36,115,'$2a$10$Rml7SoGCaoB2OuytsMUefeHWvrQDhNWdNPwpXg8JF9grsK1wA1ksa','Ricardina de Nascimento Costa','F','','114557889','258877190102','110106621909','2025-06-17','Cidade de Maputo','1964-03-13','50000','Larde','Comerciante','Larde-linha','solteiro','','','Jair Saleiro','258849518422',NULL,1,'2026-10-12 13:46:14','2026-10-12 13:46:14','Linha',0,0,NULL,NULL,0,'PF',NULL,NULL,NULL,NULL,NULL,NULL,354),(344,36,116,'$2a$10$NEl.fIVavHS/mufMCE4eTu1ts1oD6rfw/oY5CHeSCYY0xUFWX9L4e','Binajoia Sarajabo Ossufo','M','','187894190','258865324042','031208871398','2021-09-06','Cidade de Nampula','1988-11-13','50700','Pilivili','Comerciante','Pilivili','solteiro','','','Maiza','258862659572',NULL,1,'2026-10-16 07:24:43','2026-10-16 07:41:08','Pilivili',0,0,NULL,NULL,0,'PF',NULL,NULL,NULL,NULL,NULL,NULL,NULL),(345,36,117,'$2a$10$FdG8tuX0xUTf23YlyBSjpuEJA0k/Kn/iEjJQfE1kwBZUYjj/SeQ.S','Molocue Albano Bramugi','M','','159351394','258844477135','031205441817','2021-07-07','Cidade de Nampula','1979-09-11','41700','Mpuitine','Comerciante','Mpuitine','solteiro','','','Andia Augusto Momade','258874967480',NULL,1,'2026-10-16 07:39:05','2026-10-16 07:39:05','Mpuitine',0,0,NULL,NULL,0,'PF',NULL,NULL,NULL,NULL,NULL,NULL,NULL),(346,36,118,'$2a$10$IJNyUqc8777NhH60XXwqdOHFE0ap7TdTG7mwgPQi8OnT2PvdZZFxK','Chabane Selemane','M','','119976065','258','030202289252','2025-12-11','Cidade de Nampula','1998-10-10','62500','Larde-expansao','Comerciante','Larde-expansao','solteiro','','','Manacha Saide','258853770882',NULL,1,'2026-10-16 07:50:37','2026-10-16 07:50:37','Expansao',0,0,NULL,NULL,0,'PF',NULL,NULL,NULL,NULL,NULL,NULL,NULL);
/*!40000 ALTER TABLE `customers` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `debts`
--

DROP TABLE IF EXISTS `debts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `debts` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `companyId` int(11) NOT NULL,
  `accountNumber` varchar(255) NOT NULL,
  `loanId` int(11) DEFAULT NULL,
  `amortisationId` int(11) DEFAULT NULL,
  `debtAmount` decimal(15,2) NOT NULL,
  `updatedBy` varchar(255) NOT NULL,
  `dateInserted` varchar(45) NOT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `customerId` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_debts_company` (`companyId`),
  KEY `fk_debts_customer` (`customerId`),
  KEY `fk_debts_loan` (`loanId`),
  KEY `fk_debts_installment` (`amortisationId`),
  CONSTRAINT `fk_debts_company` FOREIGN KEY (`companyId`) REFERENCES `companies` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `fk_debts_customer` FOREIGN KEY (`customerId`) REFERENCES `customers` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `fk_debts_installment` FOREIGN KEY (`amortisationId`) REFERENCES `amortization_loans` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `fk_debts_loan` FOREIGN KEY (`loanId`) REFERENCES `customer_loans` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=17 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `debts`
--

LOCK TABLES `debts` WRITE;
/*!40000 ALTER TABLE `debts` DISABLE KEYS */;
/*!40000 ALTER TABLE `debts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `districts`
--

DROP TABLE IF EXISTS `districts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `districts` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `provinceId` int(11) NOT NULL,
  `createdAt` datetime NOT NULL DEFAULT current_timestamp(),
  `updatedAt` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `nome` (`name`),
  KEY `fk_districts_province` (`provinceId`),
  CONSTRAINT `fk_districts_province` FOREIGN KEY (`provinceId`) REFERENCES `provinces` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=162 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `districts`
--

LOCK TABLES `districts` WRITE;
/*!40000 ALTER TABLE `districts` DISABLE KEYS */;
INSERT INTO `districts` VALUES (1,'Ancuabe',11,'2022-10-11 06:35:21','2022-10-11 06:35:21'),(3,'Balama',11,'2022-10-11 06:35:21','2022-10-11 06:35:21'),(4,'Chiúre',11,'2022-10-11 06:35:21','2022-10-11 06:35:21'),(5,'Ibo',11,'2022-10-11 06:35:21','2022-10-11 06:35:21'),(6,'Macomia',11,'2022-10-11 06:35:21','2022-10-11 06:35:21'),(7,'Mecúfe',11,'2022-10-11 06:35:21','2022-10-11 06:35:21'),(8,'Melucu',11,'2022-10-11 06:35:21','2022-10-11 06:35:21'),(9,'Metuge',11,'2022-10-11 06:35:21','2022-10-11 06:35:21'),(10,'Mocímboa da Praia',11,'2022-10-11 06:35:21','2022-10-11 06:35:21'),(11,'Montepuez',11,'2022-10-11 06:35:21','2022-10-11 06:35:21'),(12,'Mueda',11,'2022-10-11 06:35:21','2022-10-11 06:35:21'),(13,'Muidumbe',11,'2022-10-11 06:35:21','2022-10-11 06:35:21'),(14,'Namuno',11,'2022-10-11 06:35:21','2022-10-11 06:35:21'),(15,'Nangade',11,'2022-10-11 06:35:21','2022-10-11 06:35:21'),(16,'Palma',11,'2022-10-11 06:35:21','2022-10-11 06:35:21'),(17,'Pemba',11,'2022-10-11 06:35:21','2022-10-11 06:35:21'),(18,'Quissanga',11,'2022-10-11 06:35:21','2022-10-11 06:35:21'),(19,'Bilene',3,'2022-10-11 06:35:21','2022-10-11 06:35:21'),(20,'Chibuto',3,'2022-10-11 06:35:21','2022-10-11 06:35:21'),(21,'Chicualacuala',3,'2022-10-11 06:35:21','2022-10-11 06:35:21'),(22,'Chigubo',3,'2022-10-11 06:35:21','2022-10-11 06:35:21'),(23,'Chókwè',3,'2022-10-11 06:35:21','2022-10-11 06:35:21'),(24,'Chongoene',3,'2022-10-11 06:35:21','2022-10-11 06:35:21'),(25,'Guijá',3,'2022-10-11 06:35:21','2022-10-11 06:35:21'),(26,'Limpopo',3,'2022-10-11 06:35:21','2022-10-11 06:35:21'),(27,'Mabalane',3,'2022-10-11 06:35:21','2022-10-11 06:35:21'),(28,'Manjacaze',3,'2022-10-11 06:35:21','2022-10-11 06:35:21'),(29,'Mapai',3,'2022-10-11 06:35:21','2022-10-11 06:35:21'),(30,'Massangena',3,'2022-10-11 06:35:21','2022-10-11 06:35:21'),(31,'Massingir',3,'2022-10-11 06:35:21','2022-10-11 06:35:21'),(32,'Xai-Xai',3,'2022-10-11 06:35:21','2022-10-11 06:35:21'),(33,'Funhalouro',4,'2022-10-11 06:35:21','2022-10-11 06:35:21'),(34,'Govuro',4,'2022-10-11 06:35:21','2022-10-11 06:35:21'),(35,'Homoíne',4,'2022-10-11 06:35:21','2022-10-11 06:35:21'),(36,'Inhambane',4,'2022-10-11 06:35:21','2022-10-11 06:35:21'),(37,'Inharrime',4,'2022-10-11 06:35:21','2022-10-11 06:35:21'),(38,'Inhassouro',4,'2022-10-11 06:35:21','2022-10-11 06:35:21'),(39,'Jangamo',4,'2022-10-11 06:35:21','2022-10-11 06:35:21'),(40,'Mabote',4,'2022-10-11 06:35:21','2022-10-11 06:35:21'),(41,'Massinga',4,'2022-10-11 06:35:21','2022-10-11 06:35:21'),(42,'Maxixe',4,'2022-10-11 06:35:21','2022-10-11 06:35:21'),(43,'Morrumbene',4,'2022-10-11 06:35:21','2022-10-11 06:35:21'),(44,'Panda',4,'2022-10-11 06:35:21','2022-10-11 06:35:21'),(45,'Vilanculos',4,'2022-10-11 06:35:21','2022-10-11 06:35:21'),(46,'Zavala',4,'2022-10-11 06:35:21','2022-10-11 06:35:21'),(47,'Báruè',6,'2022-10-11 06:35:21','2022-10-11 06:35:21'),(48,'Chimoio',6,'2022-10-11 06:35:21','2022-10-11 06:35:21'),(49,'Gondola',6,'2022-10-11 06:35:21','2022-10-11 06:35:21'),(50,'Guro',6,'2022-10-11 06:35:21','2022-10-11 06:35:21'),(51,'Macate',6,'2022-10-11 06:35:21','2022-10-11 06:35:21'),(52,'Machaze',6,'2022-10-11 06:35:21','2022-10-11 06:35:21'),(53,'Macossa',6,'2022-10-11 06:35:21','2022-10-11 06:35:21'),(54,'Manica',6,'2022-10-11 06:35:21','2022-10-11 06:35:21'),(55,'Mossurize',6,'2022-10-11 06:35:21','2022-10-11 06:35:21'),(56,'Sossundenga',6,'2022-10-11 06:35:21','2022-10-11 06:35:21'),(57,'Tambara',6,'2022-10-11 06:35:21','2022-10-11 06:35:21'),(58,'Vanduzi',6,'2022-10-11 06:35:21','2022-10-11 06:35:21'),(59,'Maputo',2,'2022-10-11 06:35:21','2022-10-11 06:35:21'),(60,'Magude',2,'2022-10-11 06:35:21','2022-10-11 06:35:21'),(61,'Manhiça',2,'2022-10-11 06:35:21','2022-10-11 06:35:21'),(62,'Marracuene',2,'2022-10-11 06:35:21','2022-10-11 06:35:21'),(63,'Matola',2,'2022-10-11 06:35:21','2022-10-11 06:35:21'),(64,'Moamba',2,'2022-10-11 06:35:21','2022-10-11 06:35:21'),(65,'Namaacha',2,'2022-10-11 06:35:21','2022-10-11 06:35:21'),(66,'Angoche',9,'2022-10-11 06:35:21','2022-10-11 06:35:21'),(67,'Eráti',9,'2022-10-11 06:35:21','2022-10-11 06:35:21'),(68,'Ilha de Moçambique',9,'2022-10-11 06:35:21','2022-10-11 06:35:21'),(69,'Lalaua',9,'2022-10-11 06:35:21','2022-10-11 06:35:21'),(70,'Larde',9,'2022-10-11 06:35:21','2022-10-11 06:35:21'),(71,'Liúpo',9,'2022-10-11 06:35:21','2022-10-11 06:35:21'),(72,'Malema',9,'2022-10-11 06:35:21','2022-10-11 06:35:21'),(73,'Meconta',9,'2022-10-11 06:35:21','2022-10-11 06:35:21'),(74,'Mocubúri',9,'2022-10-11 06:35:21','2022-10-11 06:35:21'),(75,'Memba',9,'2022-10-11 06:35:21','2022-10-11 06:35:21'),(76,'Mogincual',9,'2022-10-11 06:35:21','2022-10-11 06:35:21'),(77,'Mogovolas',9,'2022-10-11 06:35:21','2022-10-11 06:35:21'),(78,'Moma',9,'2022-10-11 06:35:21','2022-10-11 06:35:21'),(79,'Monapo',9,'2022-10-11 06:35:21','2022-10-11 06:35:21'),(80,'Mossuril',9,'2022-10-11 06:35:21','2022-10-11 06:35:21'),(81,'Muecate',9,'2022-10-11 06:35:21','2022-10-11 06:35:21'),(82,'Murrupula',9,'2022-10-11 06:35:21','2022-10-11 06:35:21'),(83,'Nacala-a-Velha',9,'2022-10-11 06:35:21','2022-10-11 06:35:21'),(84,'Nacala Porto',9,'2022-10-11 06:35:21','2022-10-11 06:35:21'),(85,'Nacarôa',9,'2022-10-11 06:35:21','2022-10-11 06:35:21'),(86,'Nampula',9,'2022-10-11 06:35:21','2022-10-11 06:35:21'),(87,'Rapale',9,'2022-10-11 06:35:21','2022-10-11 06:35:21'),(88,'Ribauè',9,'2022-10-11 06:35:21','2022-10-11 06:35:21'),(89,'Chimbonila',10,'2022-10-11 06:35:21','2022-10-11 06:35:21'),(90,'Cuamba',10,'2022-10-11 06:35:21','2022-10-11 06:35:21'),(91,'Lago',10,'2022-10-11 06:35:21','2022-10-11 06:35:21'),(92,'Lichinga',10,'2022-10-11 06:35:21','2022-10-11 06:35:21'),(93,'Majune',10,'2022-10-11 06:35:21','2022-10-11 06:35:21'),(94,'Mandimba',10,'2022-10-11 06:35:21','2022-10-11 06:35:21'),(95,'Marrupa',10,'2022-10-11 06:35:21','2022-10-11 06:35:21'),(96,'Maúa',10,'2022-10-11 06:35:21','2022-10-11 06:35:21'),(97,'Mavago',10,'2022-10-11 06:35:21','2022-10-11 06:35:21'),(98,'Mecanhelas',10,'2022-10-11 06:35:21','2022-10-11 06:35:21'),(99,'Mecula',10,'2022-10-11 06:35:21','2022-10-11 06:35:21'),(100,'Metarica',10,'2022-10-11 06:35:21','2022-10-11 06:35:21'),(101,'Muembe',10,'2022-10-11 06:35:21','2022-10-11 06:35:21'),(102,'N\'gauma',10,'2022-10-11 06:35:21','2022-10-11 06:35:21'),(103,'Nipepe',10,'2022-10-11 06:35:21','2022-10-11 06:35:21'),(104,'Sanga',10,'2022-10-11 06:35:21','2022-10-11 06:35:21'),(105,'Beira',5,'2022-10-11 06:35:21','2022-10-11 06:35:21'),(106,'Búzi',5,'2022-10-11 06:35:21','2022-10-11 06:35:21'),(107,'Caia',5,'2022-10-11 06:35:21','2022-10-11 06:35:21'),(108,'Chemba',5,'2022-10-11 06:35:21','2022-10-11 06:35:21'),(109,'Cheringoma',5,'2022-10-11 06:35:21','2022-10-11 06:35:21'),(110,'Chibabava',5,'2022-10-11 06:35:21','2022-10-11 06:35:21'),(111,'Dondo',5,'2022-10-11 06:35:21','2022-10-11 06:35:21'),(112,'Gorongoza',5,'2022-10-11 06:35:21','2022-10-11 06:35:21'),(113,'Machanga',5,'2022-10-11 06:35:21','2022-10-11 06:35:21'),(114,'Marínguè',5,'2022-10-11 06:35:21','2022-10-11 06:35:21'),(115,'Marromeu',5,'2022-10-11 06:35:21','2022-10-11 06:35:21'),(116,'Muanza',5,'2022-10-11 06:35:21','2022-10-11 06:35:21'),(117,'Nhamatanda',5,'2022-10-11 06:35:21','2022-10-11 06:35:21'),(118,'Angónia',7,'2022-10-11 06:35:21','2022-10-11 06:35:21'),(119,'Cahora-Bassa',7,'2022-10-11 06:35:21','2022-10-11 06:35:21'),(120,'Changarra',7,'2022-10-11 06:35:21','2022-10-11 06:35:21'),(121,'Chifunde',7,'2022-10-11 06:35:21','2022-10-11 06:35:21'),(122,'Chiuta',7,'2022-10-11 06:35:21','2022-10-11 06:35:21'),(123,'Dôa',7,'2022-10-11 06:35:21','2022-10-11 06:35:21'),(124,'Macanga',7,'2022-10-11 06:35:21','2022-10-11 06:35:21'),(125,'Màgoé',7,'2022-10-11 06:35:21','2022-10-11 06:35:21'),(126,'Marara',7,'2022-10-11 06:35:21','2022-10-11 06:35:21'),(127,'Marávia',7,'2022-10-11 06:35:21','2022-10-11 06:35:21'),(128,'Moatize',7,'2022-10-11 06:35:21','2022-10-11 06:35:21'),(129,'Mutarara',7,'2022-10-11 06:35:21','2022-10-11 06:35:21'),(130,'Tete',7,'2022-10-11 06:35:21','2022-10-11 06:35:21'),(131,'Tsangano',7,'2022-10-11 06:35:21','2022-10-11 06:35:21'),(132,'Zumbo',7,'2022-10-11 06:35:21','2022-10-11 06:35:21'),(133,'Alto Molócuè',8,'2022-10-11 06:35:21','2022-10-11 06:35:21'),(134,'Chinde',8,'2022-10-11 06:35:21','2022-10-11 06:35:21'),(135,'Derre',8,'2022-10-11 06:35:21','2022-10-11 06:35:21'),(136,'Gilé',8,'2022-10-11 06:35:21','2022-10-11 06:35:21'),(137,'Gurué',8,'2022-10-11 06:35:21','2022-10-11 06:35:21'),(138,'Ile',8,'2022-10-11 06:35:21','2022-10-11 06:35:21'),(139,'Inhassunge',8,'2022-10-11 06:35:21','2022-10-11 06:35:21'),(140,'Luabo',8,'2022-10-11 06:35:21','2022-10-11 06:35:21'),(141,'Lugela',8,'2022-10-11 06:35:21','2022-10-11 06:35:21'),(142,'Maganja da Costa',8,'2022-10-11 06:35:21','2022-10-11 06:35:21'),(143,'Milange',8,'2022-10-11 06:35:21','2022-10-11 06:35:21'),(144,'Mocuba',8,'2022-10-11 06:35:21','2022-10-11 06:35:21'),(145,'Mocubela',8,'2022-10-11 06:35:21','2022-10-11 06:35:21'),(146,'Molumbo',8,'2022-10-11 06:35:21','2022-10-11 06:35:21'),(147,'Mopeia',8,'2022-10-11 06:35:21','2022-10-11 06:35:21'),(148,'Morrumbala',8,'2022-10-11 06:35:21','2022-10-11 06:35:21'),(149,'Mulevala',8,'2022-10-11 06:35:21','2022-10-11 06:35:21'),(150,'Namacurra',8,'2022-10-11 06:35:21','2022-10-11 06:35:21'),(151,'Namarroi',8,'2022-10-11 06:35:21','2022-10-11 06:35:21'),(152,'Nicoadala',8,'2022-10-11 06:35:21','2022-10-11 06:35:21'),(153,'Pebane',8,'2022-10-11 06:35:21','2022-10-11 06:35:21'),(154,'Quelimane',8,'2022-10-11 06:35:21','2022-10-11 06:35:21'),(155,'Ka Mpfumo',1,'2022-10-11 06:35:21','2022-10-11 06:35:21'),(156,'Nlhamankulu',1,'2022-10-11 06:35:21','2022-10-11 06:35:21'),(157,'KaMaxaquene',1,'2022-10-11 06:35:21','2022-10-11 06:35:21'),(158,'KaMavota',1,'2022-10-11 06:35:21','2022-10-11 06:35:21'),(159,'KaMubukwana',1,'2022-10-11 06:35:21','2022-10-11 06:35:21'),(160,'KaTembe',1,'2022-10-11 06:35:21','2022-10-11 06:35:21'),(161,'KaNyaka',1,'2022-10-11 06:35:21','2022-10-11 06:35:21');
/*!40000 ALTER TABLE `districts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `financing_wallets`
--

DROP TABLE IF EXISTS `financing_wallets`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `financing_wallets` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `companyId` int(11) NOT NULL,
  `codigo` varchar(20) NOT NULL,
  `nome` varchar(100) NOT NULL,
  `descricao` text DEFAULT NULL,
  `tipo` enum('FINANCIAMENTO') NOT NULL DEFAULT 'FINANCIAMENTO',
  `parceiro_nome` varchar(100) DEFAULT NULL,
  `is_parceiro_externo` tinyint(1) NOT NULL DEFAULT 0,
  `parceiro_email` varchar(100) DEFAULT NULL,
  `parceiro_nuit` varchar(20) DEFAULT NULL,
  `parceiro_contacto` varchar(20) DEFAULT NULL,
  `allocated_amount` decimal(15,2) DEFAULT NULL,
  `initial_disbursed_amount` decimal(15,2) NOT NULL DEFAULT 0.00,
  `taxa_juro` decimal(8,4) DEFAULT NULL,
  `cor_badge` varchar(20) DEFAULT 'blue',
  `is_ativa` tinyint(1) NOT NULL DEFAULT 1,
  `tem_portal` tinyint(1) NOT NULL DEFAULT 0,
  `portal_ativo` tinyint(1) NOT NULL DEFAULT 1,
  `created_by` int(11) DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_codigo_company` (`companyId`,`codigo`),
  KEY `idx_financing_wallets_company_active` (`companyId`,`is_ativa`),
  CONSTRAINT `fk_financing_wallets_company` FOREIGN KEY (`companyId`) REFERENCES `companies` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=17 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `financing_wallets`
--

LOCK TABLES `financing_wallets` WRITE;
/*!40000 ALTER TABLE `financing_wallets` DISABLE KEYS */;
INSERT INTO `financing_wallets` VALUES (1,2,'KMAD','Desembolso no âmbito da parceria com a KMAD','Clientes financiados em parceria com a KMAD. Capital inicial 2.195.000 MT, dos quais 660.000 MT já desembolsados. Refere-se aos clientes financiados em parceria com a KMAD.','FINANCIAMENTO','KMAD',1,'relatorios@kmad.co.mz',NULL,NULL,2195000.00,660000.00,NULL,'blue',1,1,1,NULL,'2026-09-25 15:23:20','2026-09-25 15:23:20'),(2,2,'PME_12','Desembolso no âmbito das PME\'s - MBR / 12%','Fundo próprio MBRM para PME\'s - Taxa 12%','FINANCIAMENTO',NULL,0,NULL,NULL,NULL,NULL,0.00,0.1200,'orange',1,0,0,NULL,'2026-09-25 15:23:20','2026-09-25 15:23:20'),(3,2,'COM_9','Desembolso no âmbito das Comunidades - MBR - 9%','Fundo social (taxa bonificada) para comunidades - Taxa 9%','FINANCIAMENTO',NULL,0,NULL,NULL,NULL,NULL,0.00,0.0900,'green',1,0,0,NULL,'2026-09-25 15:23:20','2026-09-25 15:23:20'),(4,2,'INT_8','Desembolsos no âmbito Interno - 8%','Fundo interno taxa 8% - funcionários/colaboradores','FINANCIAMENTO',NULL,0,NULL,NULL,NULL,NULL,0.00,0.0800,'grey',1,0,0,NULL,'2026-09-25 15:23:20','2026-09-25 15:23:20'),(5,2,'INT_10','Desembolsos no âmbito Interno - 10%','Fundo interno taxa 10% - geral','FINANCIAMENTO',NULL,0,NULL,NULL,NULL,NULL,0.00,0.1000,'grey',1,0,0,NULL,'2026-09-25 15:23:20','2026-09-25 15:23:20'),(6,37,'KMAD','Desembolso no âmbito da parceria com a KMAD','Clientes financiados em parceria com a KMAD. Capital inicial 2.195.000 MT, dos quais 660.000 MT já desembolsados. Refere-se aos clientes financiados em parceria com a KMAD.','FINANCIAMENTO','KMAD',1,'relatorios@kmad.co.mz',NULL,NULL,2195000.00,660000.00,NULL,'blue',1,1,1,NULL,'2026-09-25 15:23:20','2026-09-25 15:23:20'),(7,37,'PME_12','Desembolso no âmbito das PME\'s - MBR / 12%','Fundo próprio MBRM para PME\'s - Taxa 12%','FINANCIAMENTO',NULL,0,NULL,NULL,NULL,NULL,0.00,0.1200,'orange',1,0,0,NULL,'2026-09-25 15:23:20','2026-09-25 15:23:20'),(8,37,'COM_9','Desembolso no âmbito das Comunidades - MBR - 9%','Fundo social (taxa bonificada) para comunidades - Taxa 9%','FINANCIAMENTO',NULL,0,NULL,NULL,NULL,NULL,0.00,0.0900,'green',1,0,0,NULL,'2026-09-25 15:23:20','2026-09-25 15:23:20'),(9,37,'INT_8','Desembolsos no âmbito Interno - 8%','Fundo interno taxa 8% - funcionários/colaboradores','FINANCIAMENTO',NULL,0,NULL,NULL,NULL,NULL,0.00,0.0800,'grey',1,0,0,NULL,'2026-09-25 15:23:20','2026-09-25 15:23:20'),(10,37,'INT_10','Desembolsos no âmbito Interno - 10%','Fundo interno taxa 10% - geral','FINANCIAMENTO',NULL,0,NULL,NULL,NULL,NULL,0.00,0.1000,'grey',1,0,0,NULL,'2026-09-25 15:23:20','2026-09-25 15:23:20'),(11,36,'KMAD','Parceiro KMAD','Clientes financiados em parceria com a KMAD. Capital inicial 2.195.000 MZN','FINANCIAMENTO','KMAD',1,'relatorios@kmad.co.mz',NULL,NULL,2195000.00,0.00,NULL,'blue',1,1,1,NULL,'2026-09-25 15:23:20','2026-09-25 15:26:37'),(12,36,'MAP_PMES_12','Maputo PMEs / 12%','Fundo próprio MBRM para PME\'s - Taxa 12%','FINANCIAMENTO',NULL,0,NULL,NULL,NULL,30000000.00,0.00,0.1200,'orange',1,0,0,NULL,'2026-09-25 15:23:20','2026-09-29 10:27:01'),(13,36,'MOA_COM_9','Moamba Comunidades - MBR - 9%','Fundo social (taxa bonificada) para comunidades - Taxa 9%','FINANCIAMENTO',NULL,0,NULL,NULL,NULL,26340000.00,0.00,0.0900,'green',1,0,0,NULL,'2026-09-25 15:23:20','2026-09-29 10:25:24'),(14,36,'TRA_INT_8','Trabalhador Interno - 8%','Fundo interno para funcionários/colaboradores','FINANCIAMENTO',NULL,0,NULL,NULL,NULL,15000000.00,0.00,0.0800,'pink',1,0,0,NULL,'2026-09-25 15:23:20','2026-10-02 12:26:03'),(15,36,'FORN_SER_10','Fornecedores de serviços - 10%','Fundo interno taxa 10% - geral','FINANCIAMENTO',NULL,0,NULL,NULL,NULL,10000000.00,0.00,0.1000,'purple',1,0,0,NULL,'2026-09-25 15:23:20','2026-09-29 10:24:05'),(16,36,'PRT_CAX','Prooteção do Caixa','Proteger o Caixa','FINANCIAMENTO',NULL,0,NULL,NULL,NULL,18660000.00,0.00,0.0000,'blue',1,0,1,329,'2026-09-29 10:29:04','2026-09-29 10:29:04');
/*!40000 ALTER TABLE `financing_wallets` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `fontes_financiamento`
--

DROP TABLE IF EXISTS `fontes_financiamento`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `fontes_financiamento` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `tenant_id` int(11) NOT NULL,
  `tipo` enum('Proprio','Alheio_Nacional','Alheio_Estrangeiro') NOT NULL,
  `descricao` varchar(255) NOT NULL,
  `montante` decimal(15,2) NOT NULL,
  `data_entrada` date NOT NULL,
  `origem` varchar(255) DEFAULT NULL,
  `categoria_periodo` enum('Emprestimo','Donativo','Aumento_Capital') DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_microfinance_tenant_date` (`tenant_id`,`data_entrada`),
  KEY `idx_fontes_financiamento_tenant` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `fontes_financiamento`
--

LOCK TABLES `fontes_financiamento` WRITE;
/*!40000 ALTER TABLE `fontes_financiamento` DISABLE KEYS */;
/*!40000 ALTER TABLE `fontes_financiamento` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `idempotency_keys`
--

DROP TABLE IF EXISTS `idempotency_keys`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `idempotency_keys` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `idem_key` varchar(80) NOT NULL,
  `company_id` int(11) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `endpoint` varchar(120) NOT NULL,
  `response_status` int(11) DEFAULT NULL,
  `response_body` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`response_body`)),
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_idem_key` (`idem_key`),
  KEY `idx_idem_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `idempotency_keys`
--

LOCK TABLES `idempotency_keys` WRITE;
/*!40000 ALTER TABLE `idempotency_keys` DISABLE KEYS */;
/*!40000 ALTER TABLE `idempotency_keys` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `interest_rates`
--

DROP TABLE IF EXISTS `interest_rates`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `interest_rates` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `companyId` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `tax` decimal(8,4) NOT NULL,
  `administrativeFee` decimal(15,6) NOT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `walletId` int(11) DEFAULT NULL,
  `accountId` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_interest_rates_company` (`companyId`),
  KEY `idx_interest_rates_walletId` (`walletId`),
  KEY `idx_interest_rates_accountId` (`accountId`),
  CONSTRAINT `fk_interest_rates_account` FOREIGN KEY (`accountId`) REFERENCES `accounts` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_interest_rates_company` FOREIGN KEY (`companyId`) REFERENCES `companies` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `fk_interest_rates_wallet` FOREIGN KEY (`walletId`) REFERENCES `financing_wallets` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=85 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `interest_rates`
--

LOCK TABLES `interest_rates` WRITE;
/*!40000 ALTER TABLE `interest_rates` DISABLE KEYS */;
INSERT INTO `interest_rates` VALUES (68,36,'Larde e Moma - Comunidades',0.0200,0.000000,'2025-01-24 09:45:37','2026-09-25 15:30:05',11,NULL),(69,36,'Moamba - Comunidades',0.0900,0.000000,'2025-01-29 07:11:31','2026-09-25 15:31:53',NULL,1),(71,36,'Larde e Moma - PMEs',0.0900,0.000000,'2025-12-13 14:18:35','2026-09-25 15:30:26',11,NULL),(80,36,'Maputo PMEs 2',0.1200,0.000000,'2026-09-09 12:07:21','2026-09-25 15:30:57',NULL,1),(81,36,'Trabalhador',0.0800,0.000000,'2026-09-11 13:05:24','2026-09-25 15:30:42',NULL,1),(82,36,'Fornecedores de Serviços',0.1000,0.000000,'2026-09-14 14:08:15','2026-09-25 15:32:10',NULL,1),(83,36,'Automóvel Interno',0.0700,0.000000,'2026-09-14 14:09:47','2026-09-25 15:31:22',NULL,1),(84,36,'Habitação',0.0600,0.000100,'2026-09-14 14:10:18','2026-10-17 12:39:18',NULL,1);
/*!40000 ALTER TABLE `interest_rates` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `late_accruals`
--

DROP TABLE IF EXISTS `late_accruals`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `late_accruals` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `amortization_loan_id` int(11) NOT NULL,
  `accrual_date` date NOT NULL,
  `days` int(11) NOT NULL DEFAULT 1,
  `base_amount` decimal(15,2) NOT NULL DEFAULT 0.00,
  `rate` decimal(6,4) NOT NULL DEFAULT 0.0000,
  `amount` decimal(15,2) NOT NULL DEFAULT 0.00,
  `status` enum('ACCRUED','CHARGED','WAIVED') NOT NULL DEFAULT 'ACCRUED',
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_accrual_day` (`amortization_loan_id`,`accrual_date`),
  KEY `idx_accrual_status` (`status`)
) ENGINE=InnoDB AUTO_INCREMENT=155 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `late_accruals`
--

LOCK TABLES `late_accruals` WRITE;
/*!40000 ALTER TABLE `late_accruals` DISABLE KEYS */;
INSERT INTO `late_accruals` VALUES (1,797,'2026-10-04',1,6670.21,1.0000,66.70,'ACCRUED','2026-10-04 00:27:39'),(2,815,'2026-10-04',1,10279.11,1.0000,102.79,'ACCRUED','2026-10-04 00:27:39'),(3,833,'2026-10-04',1,1334.04,1.0000,13.34,'ACCRUED','2026-10-04 00:27:39'),(4,851,'2026-10-04',1,20010.63,1.0000,200.11,'ACCRUED','2026-10-04 00:27:39'),(5,869,'2026-10-04',1,10005.32,1.0000,100.05,'ACCRUED','2026-10-04 00:27:39'),(6,797,'2026-10-05',1,6670.21,1.0000,66.70,'ACCRUED','2026-10-05 00:27:39'),(7,815,'2026-10-05',1,10279.11,1.0000,102.79,'ACCRUED','2026-10-05 00:27:39'),(8,833,'2026-10-05',1,1334.04,1.0000,13.34,'ACCRUED','2026-10-05 00:27:39'),(9,851,'2026-10-05',1,20010.63,1.0000,200.11,'ACCRUED','2026-10-05 00:27:39'),(10,869,'2026-10-05',1,10005.32,1.0000,100.05,'ACCRUED','2026-10-05 00:27:39'),(11,797,'2026-10-06',1,6670.21,1.0000,66.70,'ACCRUED','2026-10-06 00:27:39'),(12,815,'2026-10-06',1,10279.11,1.0000,102.79,'ACCRUED','2026-10-06 00:27:39'),(13,833,'2026-10-06',1,1334.04,1.0000,13.34,'ACCRUED','2026-10-06 00:27:39'),(14,851,'2026-10-06',1,20010.63,1.0000,200.11,'ACCRUED','2026-10-06 00:27:39'),(15,869,'2026-10-06',1,10005.32,1.0000,100.05,'ACCRUED','2026-10-06 00:27:39'),(16,797,'2026-10-07',1,6670.21,1.0000,66.70,'ACCRUED','2026-10-07 00:02:38'),(17,815,'2026-10-07',1,10279.11,1.0000,102.79,'ACCRUED','2026-10-07 00:02:38'),(18,833,'2026-10-07',1,1334.04,1.0000,13.34,'ACCRUED','2026-10-07 00:02:38'),(19,851,'2026-10-07',1,20010.63,1.0000,200.11,'ACCRUED','2026-10-07 00:02:38'),(20,869,'2026-10-07',1,10005.32,1.0000,100.05,'ACCRUED','2026-10-07 00:02:38'),(21,797,'2026-10-08',1,6670.21,1.0000,66.70,'ACCRUED','2026-10-08 00:02:38'),(22,815,'2026-10-08',1,10279.11,1.0000,102.79,'ACCRUED','2026-10-08 00:02:38'),(23,833,'2026-10-08',1,1334.04,1.0000,13.34,'ACCRUED','2026-10-08 00:02:38'),(24,851,'2026-10-08',1,20010.63,1.0000,200.11,'ACCRUED','2026-10-08 00:02:38'),(25,869,'2026-10-08',1,10005.32,1.0000,100.05,'ACCRUED','2026-10-08 00:02:38'),(26,797,'2026-10-09',1,6670.21,1.0000,66.70,'ACCRUED','2026-10-09 00:02:38'),(27,815,'2026-10-09',1,10279.11,1.0000,102.79,'ACCRUED','2026-10-09 00:02:38'),(28,833,'2026-10-09',1,1334.04,1.0000,13.34,'ACCRUED','2026-10-09 00:02:38'),(29,851,'2026-10-09',1,20010.63,1.0000,200.11,'ACCRUED','2026-10-09 00:02:38'),(30,869,'2026-10-09',1,10005.32,1.0000,100.05,'ACCRUED','2026-10-09 00:02:38'),(31,797,'2026-10-10',1,6670.21,1.0000,66.70,'ACCRUED','2026-10-10 00:02:38'),(32,815,'2026-10-10',1,10279.11,1.0000,102.79,'ACCRUED','2026-10-10 00:02:38'),(33,833,'2026-10-10',1,1334.04,1.0000,13.34,'ACCRUED','2026-10-10 00:02:38'),(34,851,'2026-10-10',1,20010.63,1.0000,200.11,'ACCRUED','2026-10-10 00:02:38'),(35,869,'2026-10-10',1,10005.32,1.0000,100.05,'ACCRUED','2026-10-10 00:02:38'),(36,797,'2026-10-11',1,6670.21,1.0000,66.70,'ACCRUED','2026-10-11 00:02:38'),(37,815,'2026-10-11',1,10279.11,1.0000,102.79,'ACCRUED','2026-10-11 00:02:38'),(38,833,'2026-10-11',1,1334.04,1.0000,13.34,'ACCRUED','2026-10-11 00:02:38'),(39,851,'2026-10-11',1,20010.63,1.0000,200.11,'ACCRUED','2026-10-11 00:02:38'),(40,869,'2026-10-11',1,10005.32,1.0000,100.05,'ACCRUED','2026-10-11 00:02:38'),(41,797,'2026-10-12',1,6670.21,1.0000,66.70,'ACCRUED','2026-10-12 00:02:38'),(42,815,'2026-10-12',1,10279.11,1.0000,102.79,'ACCRUED','2026-10-12 00:02:38'),(43,833,'2026-10-12',1,1334.04,1.0000,13.34,'ACCRUED','2026-10-12 00:02:38'),(44,851,'2026-10-12',1,20010.63,1.0000,200.11,'ACCRUED','2026-10-12 00:02:38'),(45,869,'2026-10-12',1,10005.32,1.0000,100.05,'ACCRUED','2026-10-12 00:02:38'),(46,889,'2026-10-12',1,8100.00,1.0000,81.00,'ACCRUED','2026-10-12 00:02:38'),(47,890,'2026-10-12',1,1080.00,1.0000,10.80,'ACCRUED','2026-10-12 00:02:38'),(48,891,'2026-10-12',1,6102.00,1.0000,61.02,'ACCRUED','2026-10-12 00:02:38'),(49,797,'2026-10-13',1,6670.21,1.0000,66.70,'ACCRUED','2026-10-13 00:02:38'),(50,815,'2026-10-13',1,10279.11,1.0000,102.79,'ACCRUED','2026-10-13 00:02:38'),(51,833,'2026-10-13',1,1334.04,1.0000,13.34,'ACCRUED','2026-10-13 00:02:38'),(52,851,'2026-10-13',1,20010.63,1.0000,200.11,'ACCRUED','2026-10-13 00:02:38'),(53,869,'2026-10-13',1,10005.32,1.0000,100.05,'ACCRUED','2026-10-13 00:02:38'),(54,889,'2026-10-13',1,8100.00,1.0000,81.00,'ACCRUED','2026-10-13 00:02:38'),(55,890,'2026-10-13',1,1080.00,1.0000,10.80,'ACCRUED','2026-10-13 00:02:38'),(56,891,'2026-10-13',1,6102.00,1.0000,61.02,'ACCRUED','2026-10-13 00:02:38'),(57,797,'2026-10-14',1,6670.21,1.0000,66.70,'ACCRUED','2026-10-14 00:02:38'),(58,815,'2026-10-14',1,10279.11,1.0000,102.79,'ACCRUED','2026-10-14 00:02:38'),(59,833,'2026-10-14',1,1334.04,1.0000,13.34,'ACCRUED','2026-10-14 00:02:38'),(60,851,'2026-10-14',1,20010.63,1.0000,200.11,'ACCRUED','2026-10-14 00:02:38'),(61,869,'2026-10-14',1,10005.32,1.0000,100.05,'ACCRUED','2026-10-14 00:02:38'),(62,889,'2026-10-14',1,8100.00,1.0000,81.00,'ACCRUED','2026-10-14 00:02:38'),(63,890,'2026-10-14',1,1080.00,1.0000,10.80,'ACCRUED','2026-10-14 00:02:38'),(64,891,'2026-10-14',1,6102.00,1.0000,61.02,'ACCRUED','2026-10-14 00:02:38'),(65,797,'2026-10-15',1,6670.21,1.0000,66.70,'ACCRUED','2026-10-15 00:02:38'),(66,815,'2026-10-15',1,10279.11,1.0000,102.79,'ACCRUED','2026-10-15 00:02:38'),(67,833,'2026-10-15',1,1334.04,1.0000,13.34,'ACCRUED','2026-10-15 00:02:38'),(68,851,'2026-10-15',1,20010.63,1.0000,200.11,'ACCRUED','2026-10-15 00:02:38'),(69,869,'2026-10-15',1,10005.32,1.0000,100.05,'ACCRUED','2026-10-15 00:02:38'),(70,887,'2026-10-15',1,97200.00,1.0000,972.00,'ACCRUED','2026-10-15 00:02:38'),(71,889,'2026-10-15',1,8100.00,1.0000,81.00,'ACCRUED','2026-10-15 00:02:38'),(72,890,'2026-10-15',1,1080.00,1.0000,10.80,'ACCRUED','2026-10-15 00:02:38'),(73,891,'2026-10-15',1,6102.00,1.0000,61.02,'ACCRUED','2026-10-15 00:02:38'),(74,797,'2026-10-16',1,6670.21,1.0000,66.70,'ACCRUED','2026-10-16 00:02:38'),(75,815,'2026-10-16',1,10279.11,1.0000,102.79,'ACCRUED','2026-10-16 00:02:38'),(76,833,'2026-10-16',1,1334.04,1.0000,13.34,'ACCRUED','2026-10-16 00:02:38'),(77,851,'2026-10-16',1,20010.63,1.0000,200.11,'ACCRUED','2026-10-16 00:02:38'),(78,869,'2026-10-16',1,10005.32,1.0000,100.05,'ACCRUED','2026-10-16 00:02:38'),(79,887,'2026-10-16',1,97200.00,1.0000,972.00,'ACCRUED','2026-10-16 00:02:38'),(80,889,'2026-10-16',1,8100.00,1.0000,81.00,'ACCRUED','2026-10-16 00:02:38'),(81,890,'2026-10-16',1,1080.00,1.0000,10.80,'ACCRUED','2026-10-16 00:02:38'),(82,891,'2026-10-16',1,6102.00,1.0000,61.02,'ACCRUED','2026-10-16 00:02:38'),(83,797,'2026-10-17',1,6670.21,1.0000,66.70,'ACCRUED','2026-10-17 00:02:38'),(84,815,'2026-10-17',1,10279.11,1.0000,102.79,'ACCRUED','2026-10-17 00:02:38'),(85,833,'2026-10-17',1,1334.04,1.0000,13.34,'ACCRUED','2026-10-17 00:02:38'),(86,851,'2026-10-17',1,20010.63,1.0000,200.11,'ACCRUED','2026-10-17 00:02:38'),(87,869,'2026-10-17',1,10005.32,1.0000,100.05,'ACCRUED','2026-10-17 00:02:38'),(88,887,'2026-10-17',1,97200.00,1.0000,972.00,'ACCRUED','2026-10-17 00:02:38'),(89,889,'2026-10-17',1,8100.00,1.0000,81.00,'ACCRUED','2026-10-17 00:02:39'),(90,890,'2026-10-17',1,1080.00,1.0000,10.80,'ACCRUED','2026-10-17 00:02:39'),(91,891,'2026-10-17',1,6102.00,1.0000,61.02,'ACCRUED','2026-10-17 00:02:39'),(101,797,'2026-10-18',1,6670.21,1.0000,66.70,'ACCRUED','2026-10-18 22:49:07'),(102,815,'2026-10-18',1,10279.11,1.0000,102.79,'ACCRUED','2026-10-18 22:49:07'),(103,833,'2026-10-18',1,1334.04,1.0000,13.34,'ACCRUED','2026-10-18 22:49:07'),(104,851,'2026-10-18',1,20010.63,1.0000,200.11,'ACCRUED','2026-10-18 22:49:07'),(105,869,'2026-10-18',1,10005.32,1.0000,100.05,'ACCRUED','2026-10-18 22:49:07'),(106,887,'2026-10-18',1,97200.00,1.0000,972.00,'ACCRUED','2026-10-18 22:49:07'),(107,889,'2026-10-18',1,8100.00,1.0000,81.00,'ACCRUED','2026-10-18 22:49:07'),(108,890,'2026-10-18',1,1080.00,1.0000,10.80,'ACCRUED','2026-10-18 22:49:07'),(109,891,'2026-10-18',1,6102.00,1.0000,61.02,'ACCRUED','2026-10-18 22:49:07'),(110,797,'2026-10-19',1,6670.21,1.0000,66.70,'ACCRUED','2026-10-19 22:00:54'),(111,815,'2026-10-19',1,10279.11,1.0000,102.79,'ACCRUED','2026-10-19 22:00:54'),(112,833,'2026-10-19',1,1334.04,1.0000,13.34,'ACCRUED','2026-10-19 22:00:54'),(113,851,'2026-10-19',1,20010.63,1.0000,200.11,'ACCRUED','2026-10-19 22:00:54'),(114,869,'2026-10-19',1,10005.32,1.0000,100.05,'ACCRUED','2026-10-19 22:00:55'),(115,887,'2026-10-19',1,97200.00,1.0000,972.00,'ACCRUED','2026-10-19 22:00:55'),(116,889,'2026-10-19',1,8100.00,1.0000,81.00,'ACCRUED','2026-10-19 22:00:55'),(117,890,'2026-10-19',1,1080.00,1.0000,10.80,'ACCRUED','2026-10-19 22:00:55'),(118,891,'2026-10-19',1,6102.00,1.0000,61.02,'ACCRUED','2026-10-19 22:00:55'),(119,797,'2026-10-20',1,6670.21,1.0000,66.70,'ACCRUED','2026-10-20 22:00:54'),(120,815,'2026-10-20',1,10279.11,1.0000,102.79,'ACCRUED','2026-10-20 22:00:54'),(121,833,'2026-10-20',1,1334.04,1.0000,13.34,'ACCRUED','2026-10-20 22:00:54'),(122,851,'2026-10-20',1,20010.63,1.0000,200.11,'ACCRUED','2026-10-20 22:00:55'),(123,869,'2026-10-20',1,10005.32,1.0000,100.05,'ACCRUED','2026-10-20 22:00:55'),(124,887,'2026-10-20',1,97200.00,1.0000,972.00,'ACCRUED','2026-10-20 22:00:55'),(125,889,'2026-10-20',1,8100.00,1.0000,81.00,'ACCRUED','2026-10-20 22:00:55'),(126,890,'2026-10-20',1,1080.00,1.0000,10.80,'ACCRUED','2026-10-20 22:00:55'),(127,891,'2026-10-20',1,6102.00,1.0000,61.02,'ACCRUED','2026-10-20 22:00:55'),(128,797,'2026-10-21',1,6670.21,1.0000,66.70,'ACCRUED','2026-10-21 22:00:55'),(129,815,'2026-10-21',1,10279.11,1.0000,102.79,'ACCRUED','2026-10-21 22:00:55'),(130,833,'2026-10-21',1,1334.04,1.0000,13.34,'ACCRUED','2026-10-21 22:00:55'),(131,851,'2026-10-21',1,20010.63,1.0000,200.11,'ACCRUED','2026-10-21 22:00:55'),(132,869,'2026-10-21',1,10005.32,1.0000,100.05,'ACCRUED','2026-10-21 22:00:55'),(133,887,'2026-10-21',1,97200.00,1.0000,972.00,'ACCRUED','2026-10-21 22:00:55'),(134,889,'2026-10-21',1,8100.00,1.0000,81.00,'ACCRUED','2026-10-21 22:00:55'),(135,890,'2026-10-21',1,1080.00,1.0000,10.80,'ACCRUED','2026-10-21 22:00:55'),(136,891,'2026-10-21',1,6102.00,1.0000,61.02,'ACCRUED','2026-10-21 22:00:55'),(137,797,'2026-10-22',1,6670.21,1.0000,66.70,'ACCRUED','2026-10-22 22:00:55'),(138,815,'2026-10-22',1,10279.11,1.0000,102.79,'ACCRUED','2026-10-22 22:00:55'),(139,833,'2026-10-22',1,1334.04,1.0000,13.34,'ACCRUED','2026-10-22 22:00:55'),(140,851,'2026-10-22',1,20010.63,1.0000,200.11,'ACCRUED','2026-10-22 22:00:55'),(141,869,'2026-10-22',1,10005.32,1.0000,100.05,'ACCRUED','2026-10-22 22:00:55'),(142,887,'2026-10-22',1,97200.00,1.0000,972.00,'ACCRUED','2026-10-22 22:00:55'),(143,889,'2026-10-22',1,8100.00,1.0000,81.00,'ACCRUED','2026-10-22 22:00:55'),(144,890,'2026-10-22',1,1080.00,1.0000,10.80,'ACCRUED','2026-10-22 22:00:55'),(145,891,'2026-10-22',1,6102.00,1.0000,61.02,'ACCRUED','2026-10-22 22:00:55'),(146,797,'2026-10-23',1,6670.21,1.0000,66.70,'ACCRUED','2026-10-23 22:00:55'),(147,815,'2026-10-23',1,10279.11,1.0000,102.79,'ACCRUED','2026-10-23 22:00:55'),(148,833,'2026-10-23',1,1334.04,1.0000,13.34,'ACCRUED','2026-10-23 22:00:55'),(149,851,'2026-10-23',1,20010.63,1.0000,200.11,'ACCRUED','2026-10-23 22:00:55'),(150,869,'2026-10-23',1,10005.32,1.0000,100.05,'ACCRUED','2026-10-23 22:00:55'),(151,887,'2026-10-23',1,97200.00,1.0000,972.00,'ACCRUED','2026-10-23 22:00:55'),(152,889,'2026-10-23',1,8100.00,1.0000,81.00,'ACCRUED','2026-10-23 22:00:55'),(153,890,'2026-10-23',1,1080.00,1.0000,10.80,'ACCRUED','2026-10-23 22:00:55'),(154,891,'2026-10-23',1,6102.00,1.0000,61.02,'ACCRUED','2026-10-23 22:00:55');
/*!40000 ALTER TABLE `late_accruals` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `loan_approvals`
--

DROP TABLE IF EXISTS `loan_approvals`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `loan_approvals` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `loanId` int(11) NOT NULL,
  `companyId` int(11) NOT NULL,
  `event` varchar(30) NOT NULL,
  `actorId` int(11) DEFAULT NULL,
  `actorName` varchar(255) DEFAULT NULL,
  `actorRole` varchar(60) DEFAULT NULL,
  `amount` decimal(15,2) DEFAULT NULL,
  `approvalsCount` int(11) DEFAULT NULL,
  `requiredApprovals` int(11) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `createdAt` datetime NOT NULL DEFAULT current_timestamp(),
  `updatedAt` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_loan_approvals_loan` (`loanId`,`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `loan_approvals`
--

LOCK TABLES `loan_approvals` WRITE;
/*!40000 ALTER TABLE `loan_approvals` DISABLE KEYS */;
/*!40000 ALTER TABLE `loan_approvals` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `loan_guarantees`
--

DROP TABLE IF EXISTS `loan_guarantees`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `loan_guarantees` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `loanId` int(11) NOT NULL,
  `guaranteeDescription` varchar(255) NOT NULL,
  `guaranteeFileUrl` varchar(255) NOT NULL,
  `purchaseAmount` decimal(15,2) DEFAULT NULL,
  `status` int(11) DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_guarantees_loan` (`loanId`),
  CONSTRAINT `fk_guarantees_loan` FOREIGN KEY (`loanId`) REFERENCES `customer_loans` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=112 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `loan_guarantees`
--

LOCK TABLES `loan_guarantees` WRITE;
/*!40000 ALTER TABLE `loan_guarantees` DISABLE KEYS */;
INSERT INTO `loan_guarantees` VALUES (97,62,'Uma residência tipo 2, localizada em Larde, no bairro de Maganha perto do rio Maganha','/documents/ea32ae6c565de4ebf43a7e61978dc9e2_BartolomeuResidência.jpg',200000.00,1,'2026-09-01 13:36:34','2026-09-01 13:36:34'),(98,62,'A loja comercial feita a blocos (mercearia)','/documents/c2fdd07c4bafaadcd0cf3ea08399c1d9_BartolomeuResMercearia.jpg',2.00,1,'2026-09-01 13:37:13','2026-09-01 13:37:13'),(99,67,'Uma mercearia localizada no bairro de Tipane','/documents/a736cb3f7320f924e0fe7d0a8a1920ff_SaideMercearia.jpg',130000.00,1,'2026-09-01 14:33:32','2026-09-01 14:33:32'),(100,68,'A parte frontal de uma casa tipo 2, com dois quartos e sala, 1 cozinha, casa de banho interna e uma varanda.','/documents/9b61ece0a7b8eeafe3ca6dbeb7e9e13a_ResidenciaSergio.jpg',900000.00,1,'2026-09-01 14:41:16','2026-09-01 14:41:16'),(102,63,'A sua residencia feita de material precario','/documents/fefcb20481772dc57c0788263e011a14_1000000041.jpg',30000.00,0,'2026-09-01 19:27:13','2026-09-01 19:27:13'),(104,66,'Um carro Toyota Alphard, AML 485 MC, na cor branca','/documents/04504aefa9aee7ba84b024af4bbde10f_IMG-20260828-WA0012.jpg',900000.00,0,'2026-09-01 19:34:09','2026-09-01 19:34:09'),(106,61,'Mercearia localizada no mercado de Mutiticoma, perto do Frank','/documents/4b722a04b11a97d1f7e783fb62d1f8bb_IMG_20260128_130948_688.jpg',190000.00,0,'2026-09-01 20:19:34','2026-09-01 20:19:34'),(107,69,'Gerador industrial de 40KVA, segunda mão','/documents/1e71ea6366985551b8c172e8602a34c0_IMG-20260827-WA0012.jpg',455000.00,0,'2026-09-03 10:30:17','2026-09-03 10:30:17');
/*!40000 ALTER TABLE `loan_guarantees` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `microcredit_payment_events`
--

DROP TABLE IF EXISTS `microcredit_payment_events`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `microcredit_payment_events` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `tenant_id` int(11) NOT NULL,
  `credito_id` int(11) NOT NULL,
  `prestacao_id` int(11) NOT NULL,
  `data_pagamento` date NOT NULL,
  `capital_pago` decimal(15,2) NOT NULL DEFAULT 0.00,
  `juro_pago` decimal(15,2) NOT NULL DEFAULT 0.00,
  `forma` enum('M-Pesa','BCI','eMola','Dinheiro') NOT NULL,
  `registado_por` int(11) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_micropayment_tenant_date` (`tenant_id`,`data_pagamento`),
  KEY `idx_micropayment_credit` (`tenant_id`,`credito_id`),
  KEY `fk_microevent_credit` (`credito_id`),
  KEY `fk_microevent_installment` (`prestacao_id`),
  KEY `idx_microcredit_payment_events_tenant` (`tenant_id`),
  CONSTRAINT `fk_microevent_credit` FOREIGN KEY (`credito_id`) REFERENCES `creditos` (`id`),
  CONSTRAINT `fk_microevent_installment` FOREIGN KEY (`prestacao_id`) REFERENCES `pagamentos_credito` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `microcredit_payment_events`
--

LOCK TABLES `microcredit_payment_events` WRITE;
/*!40000 ALTER TABLE `microcredit_payment_events` DISABLE KEYS */;
/*!40000 ALTER TABLE `microcredit_payment_events` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `movimentos_financeiros_operador`
--

DROP TABLE IF EXISTS `movimentos_financeiros_operador`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `movimentos_financeiros_operador` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `tenant_id` int(11) NOT NULL,
  `tipo` enum('Caixa','Bancos','Outros_Activos') NOT NULL,
  `mes` tinyint(4) NOT NULL,
  `data` date NOT NULL,
  `montante` decimal(15,2) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_micromovement_tenant_date` (`tenant_id`,`data`),
  KEY `idx_movimentos_financeiros_operador_tenant` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `movimentos_financeiros_operador`
--

LOCK TABLES `movimentos_financeiros_operador` WRITE;
/*!40000 ALTER TABLE `movimentos_financeiros_operador` DISABLE KEYS */;
/*!40000 ALTER TABLE `movimentos_financeiros_operador` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `notifications`
--

DROP TABLE IF EXISTS `notifications`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `notifications` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `companyId` int(11) NOT NULL,
  `recipientType` varchar(255) NOT NULL,
  `recipientId` int(11) NOT NULL,
  `title` varchar(255) NOT NULL,
  `message` text NOT NULL,
  `type` varchar(255) NOT NULL,
  `referenceId` int(11) DEFAULT NULL,
  `isRead` tinyint(1) NOT NULL DEFAULT 0,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `userId` int(11) DEFAULT NULL,
  `customerId` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_notifications_user` (`userId`),
  KEY `fk_notifications_customer` (`customerId`),
  CONSTRAINT `fk_notifications_customer` FOREIGN KEY (`customerId`) REFERENCES `customers` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_notifications_user` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=110 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `notifications`
--

LOCK TABLES `notifications` WRITE;
/*!40000 ALTER TABLE `notifications` DISABLE KEYS */;
INSERT INTO `notifications` VALUES (81,36,'customer',325,'Crédito aprovado','O seu crédito de 15 000 MZN foi aprovado.','loan_approved',56,0,'2026-08-28 18:08:20','2026-08-28 18:08:20',NULL,NULL),(82,36,'customer',325,'Crédito aprovado','O seu crédito de 15 000 MZN foi aprovado.','loan_approved',56,0,'2026-08-28 18:10:38','2026-08-28 18:10:38',NULL,NULL),(83,36,'customer',325,'Pagamento confirmado','O seu pagamento de 4630,03 MZN foi registado com sucesso.','payment_received',140,0,'2026-08-29 08:48:52','2026-08-29 08:48:52',NULL,NULL);
/*!40000 ALTER TABLE `notifications` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `onboarding_progress`
--

DROP TABLE IF EXISTS `onboarding_progress`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `onboarding_progress` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `companyId` int(11) NOT NULL,
  `userId` int(11) NOT NULL,
  `taskId` varchar(60) NOT NULL,
  `roleId` int(11) DEFAULT NULL,
  `completedAt` datetime NOT NULL DEFAULT current_timestamp(),
  `createdAt` datetime NOT NULL DEFAULT current_timestamp(),
  `updatedAt` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_onboarding_user_task` (`userId`,`taskId`),
  KEY `idx_onboarding_company` (`companyId`,`userId`),
  KEY `idx_onboarding_company_task` (`companyId`,`taskId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `onboarding_progress`
--

LOCK TABLES `onboarding_progress` WRITE;
/*!40000 ALTER TABLE `onboarding_progress` DISABLE KEYS */;
/*!40000 ALTER TABLE `onboarding_progress` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `pagamentos_credito`
--

DROP TABLE IF EXISTS `pagamentos_credito`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `pagamentos_credito` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `tenant_id` int(11) NOT NULL,
  `credito_id` int(11) NOT NULL,
  `numero_prestacao` int(11) NOT NULL,
  `data_vencimento` date NOT NULL,
  `capital_previsto` decimal(15,2) NOT NULL,
  `juro_previsto` decimal(15,2) NOT NULL,
  `total_previsto` decimal(15,2) NOT NULL,
  `data_pagamento` date DEFAULT NULL,
  `capital_pago` decimal(15,2) NOT NULL DEFAULT 0.00,
  `juro_pago` decimal(15,2) NOT NULL DEFAULT 0.00,
  `total_pago` decimal(15,2) NOT NULL DEFAULT 0.00,
  `forma` enum('M-Pesa','BCI','eMola','Dinheiro') DEFAULT NULL,
  `estado` enum('Pendente','Parcial','Pago') NOT NULL DEFAULT 'Pendente',
  `dias_atraso` int(11) NOT NULL DEFAULT 0,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_microinstallment_tenant_due` (`tenant_id`,`credito_id`,`data_vencimento`),
  KEY `fk_microinstallment_credit` (`credito_id`),
  KEY `idx_pagamentos_credito_tenant` (`tenant_id`),
  CONSTRAINT `fk_microinstallment_credit` FOREIGN KEY (`credito_id`) REFERENCES `creditos` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `pagamentos_credito`
--

LOCK TABLES `pagamentos_credito` WRITE;
/*!40000 ALTER TABLE `pagamentos_credito` DISABLE KEYS */;
/*!40000 ALTER TABLE `pagamentos_credito` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `payment_allocations`
--

DROP TABLE IF EXISTS `payment_allocations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `payment_allocations` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `payment_id` int(11) NOT NULL,
  `amortization_loan_id` int(11) NOT NULL,
  `component` enum('PENALTY','LATE_INTEREST','INTEREST','CAPITAL') NOT NULL,
  `amount` decimal(15,2) NOT NULL DEFAULT 0.00,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_alloc_payment` (`payment_id`),
  KEY `idx_alloc_amort` (`amortization_loan_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `payment_allocations`
--

LOCK TABLES `payment_allocations` WRITE;
/*!40000 ALTER TABLE `payment_allocations` DISABLE KEYS */;
/*!40000 ALTER TABLE `payment_allocations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `provinces`
--

DROP TABLE IF EXISTS `provinces`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `provinces` (
  `id` int(11) NOT NULL,
  `name` varchar(50) NOT NULL,
  `createdAt` datetime NOT NULL DEFAULT current_timestamp(),
  `updatedAt` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `provinces`
--

LOCK TABLES `provinces` WRITE;
/*!40000 ALTER TABLE `provinces` DISABLE KEYS */;
INSERT INTO `provinces` VALUES (1,'Maputo Cidade','2022-10-11 06:36:21','2022-10-11 06:36:21'),(2,'Maputo Província','2022-10-11 06:36:21','2022-10-11 06:36:21'),(3,'Gaza','2022-10-11 06:36:21','2022-10-11 06:36:21'),(4,'Inhambane','2022-10-11 06:36:21','2022-10-11 06:36:21'),(5,'Sofala','2022-10-11 06:36:21','2022-10-11 06:36:21'),(6,'Manica','2022-10-11 06:36:21','2022-10-11 06:36:21'),(7,'Tete','2022-10-11 06:36:21','2022-10-11 06:36:21'),(8,'Zambézia','2022-10-11 06:36:21','2022-10-11 06:36:21'),(9,'Nampula','2022-10-11 06:36:21','2022-10-11 06:36:21'),(10,'Niassa','2022-10-11 06:36:21','2022-10-11 06:36:21'),(11,'Cabo Delgado','2022-10-11 06:36:21','2022-10-11 06:36:21');
/*!40000 ALTER TABLE `provinces` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `recibos`
--

DROP TABLE IF EXISTS `recibos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `recibos` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `companyId` int(11) NOT NULL,
  `numero` varchar(50) NOT NULL,
  `serie` varchar(20) NOT NULL DEFAULT 'REC',
  `sequencia` int(11) NOT NULL,
  `ano` int(11) NOT NULL,
  `tranzactionId` int(11) DEFAULT NULL,
  `loanId` int(11) DEFAULT NULL,
  `customerId` int(11) DEFAULT NULL,
  `walletId` int(11) DEFAULT NULL,
  `customer_name` varchar(255) DEFAULT NULL,
  `customer_nuit` varchar(30) DEFAULT NULL,
  `customer_account` varchar(60) DEFAULT NULL,
  `wallet_nome` varchar(100) DEFAULT NULL,
  `metodo_pagamento` varchar(30) DEFAULT NULL,
  `referencia` varchar(100) DEFAULT NULL,
  `valor_pago` decimal(15,2) NOT NULL DEFAULT 0.00,
  `valor_capital` decimal(15,2) NOT NULL DEFAULT 0.00,
  `valor_juros` decimal(15,2) NOT NULL DEFAULT 0.00,
  `valor_mora` decimal(15,2) NOT NULL DEFAULT 0.00,
  `valor_desconto` decimal(15,2) NOT NULL DEFAULT 0.00,
  `saldo_restante` decimal(15,2) NOT NULL DEFAULT 0.00,
  `pdf_url` varchar(255) DEFAULT NULL,
  `created_by` int(11) DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `hash_at` varchar(128) DEFAULT NULL,
  `qr_code_url` varchar(255) DEFAULT NULL,
  `qr_content` text DEFAULT NULL,
  `at_validation_code` varchar(50) DEFAULT NULL,
  `software_certification` varchar(100) DEFAULT NULL,
  `metodo_pagamento_desc` varchar(100) DEFAULT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'EMITIDO',
  `annulled_by_recibo_id` int(11) DEFAULT NULL,
  `annulment_reason` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_numero` (`numero`),
  UNIQUE KEY `unique_numero_company_ano` (`companyId`,`ano`,`sequencia`),
  KEY `idx_recibos_loan` (`loanId`),
  KEY `idx_recibos_wallet` (`walletId`),
  KEY `idx_recibos_tranzaction` (`tranzactionId`),
  KEY `idx_recibos_hash_at` (`hash_at`),
  CONSTRAINT `fk_recibos_company` FOREIGN KEY (`companyId`) REFERENCES `companies` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `recibos`
--

LOCK TABLES `recibos` WRITE;
/*!40000 ALTER TABLE `recibos` DISABLE KEYS */;
/*!40000 ALTER TABLE `recibos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `recibos_sequencia`
--

DROP TABLE IF EXISTS `recibos_sequencia`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `recibos_sequencia` (
  `companyId` int(11) NOT NULL,
  `ano` int(11) NOT NULL,
  `ultima_sequencia` int(11) NOT NULL DEFAULT 0,
  PRIMARY KEY (`companyId`,`ano`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `recibos_sequencia`
--

LOCK TABLES `recibos_sequencia` WRITE;
/*!40000 ALTER TABLE `recibos_sequencia` DISABLE KEYS */;
/*!40000 ALTER TABLE `recibos_sequencia` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sms`
--

DROP TABLE IF EXISTS `sms`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sms` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `companyId` int(11) NOT NULL,
  `receipient` varchar(255) NOT NULL,
  `accountNumber` varchar(255) NOT NULL,
  `smsBody` varchar(255) NOT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sms`
--

LOCK TABLES `sms` WRITE;
/*!40000 ALTER TABLE `sms` DISABLE KEYS */;
/*!40000 ALTER TABLE `sms` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sms_gateway_inbox`
--

DROP TABLE IF EXISTS `sms_gateway_inbox`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sms_gateway_inbox` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `deviceId` varchar(120) NOT NULL,
  `senderPhone` varchar(30) DEFAULT NULL,
  `receiverPhone` varchar(30) DEFAULT NULL,
  `messageBody` text NOT NULL,
  `receivedAt` datetime NOT NULL,
  `contentHash` varchar(64) NOT NULL,
  `createdAt` datetime NOT NULL DEFAULT current_timestamp(),
  `updatedAt` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `contentHash` (`contentHash`),
  KEY `idx_sms_gateway_inbox_device_received` (`deviceId`,`receivedAt`)
) ENGINE=InnoDB AUTO_INCREMENT=105 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sms_gateway_inbox`
--

LOCK TABLES `sms_gateway_inbox` WRITE;
/*!40000 ALTER TABLE `sms_gateway_inbox` DISABLE KEYS */;
/*!40000 ALTER TABLE `sms_gateway_inbox` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sms_queue`
--

DROP TABLE IF EXISTS `sms_queue`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sms_queue` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `companyId` int(11) NOT NULL,
  `accountNumber` varchar(60) DEFAULT NULL,
  `loanId` int(11) DEFAULT NULL,
  `amortizationLoanId` int(11) DEFAULT NULL,
  `transactionId` int(11) DEFAULT NULL,
  `debtId` int(11) DEFAULT NULL,
  `customerName` varchar(255) DEFAULT NULL,
  `phone` varchar(20) NOT NULL,
  `messageType` varchar(60) NOT NULL,
  `messageBody` text NOT NULL,
  `payloadJson` longtext DEFAULT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'queued',
  `retries` int(11) NOT NULL DEFAULT 0,
  `gatewayMessageId` varchar(255) DEFAULT NULL,
  `errorMessage` varchar(255) DEFAULT NULL,
  `sentAt` datetime DEFAULT NULL,
  `lastAttemptAt` datetime DEFAULT NULL,
  `createdAt` datetime NOT NULL DEFAULT current_timestamp(),
  `updatedAt` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `customerId` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_sms_queue_status_created` (`status`,`createdAt`),
  KEY `idx_sms_queue_company_status` (`companyId`,`status`),
  KEY `idx_sms_queue_company_type_ref` (`companyId`,`messageType`,`amortizationLoanId`)
) ENGINE=InnoDB AUTO_INCREMENT=68 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sms_queue`
--

LOCK TABLES `sms_queue` WRITE;
/*!40000 ALTER TABLE `sms_queue` DISABLE KEYS */;
/*!40000 ALTER TABLE `sms_queue` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `subscription_plans`
--

DROP TABLE IF EXISTS `subscription_plans`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `subscription_plans` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(50) NOT NULL,
  `slug` varchar(50) DEFAULT NULL,
  `price_mzn` decimal(10,2) NOT NULL,
  `max_clients` int(11) NOT NULL,
  `features` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`features`)),
  `is_popular` tinyint(1) DEFAULT 0,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `slug` (`slug`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `subscription_plans`
--

LOCK TABLES `subscription_plans` WRITE;
/*!40000 ALTER TABLE `subscription_plans` DISABLE KEYS */;
INSERT INTO `subscription_plans` VALUES (1,'Starter','starter',2500.00,100,'[\"Até 100 clientes\",\"Relatórios BM\",\"Suporte WhatsApp\"]',0,1,'2026-09-14 11:43:05'),(2,'Crescimento','crescimento',4500.00,500,'[\"Até 500 clientes\",\"Tudo do Starter\",\"Caixa Multi-contas\",\"Alertas SMS\"]',1,1,'2026-09-14 11:43:05'),(3,'Profissional','profissional',8500.00,999999,'[\"Clientes ilimitados\",\"Tudo do Crescimento\",\"API Completa\",\"Suporte Prioritário\"]',0,1,'2026-09-14 11:43:05');
/*!40000 ALTER TABLE `subscription_plans` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tranzactions`
--

DROP TABLE IF EXISTS `tranzactions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tranzactions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `companyId` int(11) NOT NULL,
  `amortizationLoanId` int(11) NOT NULL,
  `loanId` int(11) NOT NULL,
  `accountNumber` int(11) NOT NULL,
  `amount` decimal(15,2) NOT NULL,
  `latePaymentInterest` decimal(15,2) NOT NULL,
  `interestRateAmount` decimal(15,2) NOT NULL,
  `phoneNumber` varchar(255) NOT NULL,
  `paymentDate` date NOT NULL,
  `tranzactionReference` varchar(255) NOT NULL,
  `paymentMethod` int(11) NOT NULL,
  `description` longtext NOT NULL,
  `receiptUrl` longtext DEFAULT NULL,
  `staffName` varchar(255) NOT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `notes` text DEFAULT NULL,
  `discountApplied` tinyint(1) DEFAULT 0,
  `discountAmount` decimal(15,2) DEFAULT 0.00,
  `customerId` int(11) DEFAULT NULL,
  `totalAmount` decimal(15,2) DEFAULT NULL,
  `walletId` int(11) DEFAULT NULL,
  `mora_amount` decimal(15,2) NOT NULL DEFAULT 0.00,
  `received_by` int(11) DEFAULT NULL,
  `received_ip` varchar(64) DEFAULT NULL,
  `idem_key` varchar(80) DEFAULT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'CONFIRMED',
  `reversed_by` int(11) DEFAULT NULL,
  `reversal_reason` varchar(255) DEFAULT NULL,
  `reversed_tranzaction_id` int(11) DEFAULT NULL,
  `bank_account_id` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_tranz_ref` (`companyId`,`paymentMethod`,`tranzactionReference`),
  KEY `idx_tranzactions_company_createdAt` (`companyId`,`createdAt`),
  KEY `idx_tranzactions_company_loan` (`companyId`,`loanId`),
  KEY `idx_tranzactions_accountNumber` (`accountNumber`),
  KEY `idx_tranzactions_paymentMethod` (`paymentMethod`),
  KEY `fk_transactions_installment` (`amortizationLoanId`),
  KEY `fk_transactions_loan` (`loanId`),
  KEY `fk_transactions_customer` (`customerId`),
  KEY `idx_tranzactions_walletId` (`walletId`),
  KEY `idx_tranz_idem` (`idem_key`),
  KEY `idx_tranz_status` (`status`),
  KEY `idx_tranz_bank_account` (`bank_account_id`),
  CONSTRAINT `fk_transactions_customer` FOREIGN KEY (`customerId`) REFERENCES `customers` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `fk_transactions_installment` FOREIGN KEY (`amortizationLoanId`) REFERENCES `amortization_loans` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `fk_transactions_loan` FOREIGN KEY (`loanId`) REFERENCES `customer_loans` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `fk_transactions_wallet` FOREIGN KEY (`walletId`) REFERENCES `financing_wallets` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=163 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tranzactions`
--

LOCK TABLES `tranzactions` WRITE;
/*!40000 ALTER TABLE `tranzactions` DISABLE KEYS */;
/*!40000 ALTER TABLE `tranzactions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_logs`
--

DROP TABLE IF EXISTS `user_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_logs` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `companyId` int(11) NOT NULL,
  `description` varchar(255) NOT NULL,
  `userId` int(11) NOT NULL,
  `userName` varchar(255) NOT NULL,
  `action` varchar(255) NOT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `userRole` int(11) DEFAULT NULL,
  `module` varchar(100) DEFAULT NULL,
  `ipAddress` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_user_logs_company` (`companyId`),
  KEY `fk_user_logs_user` (`userId`),
  CONSTRAINT `fk_user_logs_company` FOREIGN KEY (`companyId`) REFERENCES `companies` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `fk_user_logs_user` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=1342 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_logs`
--

LOCK TABLES `user_logs` WRITE;
/*!40000 ALTER TABLE `user_logs` DISABLE KEYS */;
INSERT INTO `user_logs` VALUES (937,36,'Dados da empresa actualizados: Dados gerais, Logotipo, Meios de pagamento',329,'Eliana Munguambe','EDITAR','2026-09-01 16:17:28','2026-09-01 16:17:28',1,'Configurações',NULL),(938,36,'Dados da empresa actualizados: Dados gerais, Logotipo, Meios de pagamento',329,'Eliana Munguambe','EDITAR','2026-09-01 16:21:08','2026-09-01 16:21:08',1,'Configurações',NULL),(939,36,'Utilizador \"Iracema Muhuai\" criado',329,'Eliana Munguambe','CRIAR','2026-09-01 16:24:09','2026-09-01 16:24:09',1,'Utilizadores',NULL),(940,36,'Iracema Muhuai fez login no sistema',354,'Iracema Muhuai','LOGIN','2026-09-01 16:31:04','2026-09-01 16:31:04',3,'Autenticação',NULL),(941,36,'Iracema Muhuai fez login no sistema',354,'Iracema Muhuai','LOGIN','2026-09-01 17:10:05','2026-09-01 17:10:05',3,'Autenticação',NULL),(942,36,'Eliana Munguambe fez login no sistema',329,'Eliana Munguambe','LOGIN','2026-09-01 17:20:36','2026-09-01 17:20:36',1,'Autenticação',NULL),(943,36,'Crédito de 90 000,00 MT aprovado para \"Bartolomeu Alfredo Vasco\"',329,'Eliana Munguambe','APROVAR','2026-09-01 17:22:00','2026-09-01 17:22:00',1,'Créditos',NULL),(944,36,'Eliana Munguambe fez login no sistema',329,'Eliana Munguambe','LOGIN','2026-09-01 17:26:31','2026-09-01 17:26:31',1,'Autenticação',NULL),(945,36,'Iracema Muhuai fez logout do sistema',354,'Iracema Muhuai','LOGOUT','2026-09-01 17:26:50','2026-09-01 17:26:50',3,'Autenticação',NULL),(946,36,'Taxas de juro actualizadas',329,'Eliana Munguambe','CONFIGURAR','2026-09-01 17:33:51','2026-09-01 17:33:51',1,'Taxas de Juro',NULL),(947,36,'Taxas de juro actualizadas',329,'Eliana Munguambe','CONFIGURAR','2026-09-01 17:33:59','2026-09-01 17:33:59',1,'Taxas de Juro',NULL),(948,36,'Taxas de juro actualizadas',329,'Eliana Munguambe','CONFIGURAR','2026-09-01 17:34:03','2026-09-01 17:34:03',1,'Taxas de Juro',NULL),(949,36,'Taxas de juro actualizadas',329,'Eliana Munguambe','CONFIGURAR','2026-09-01 17:34:11','2026-09-01 17:34:11',1,'Taxas de Juro',NULL),(950,36,'Conta \"FNB\" actualizada',329,'Eliana Munguambe','EDITAR','2026-09-01 17:41:38','2026-09-01 17:41:38',1,'Contas Bancárias',NULL),(951,36,'Eliana Munguambe fez login no sistema',329,'Eliana Munguambe','LOGIN','2026-09-01 18:46:34','2026-09-01 18:46:34',1,'Autenticação',NULL),(952,36,'Eliana Munguambe fez login no sistema',329,'Eliana Munguambe','LOGIN','2026-09-01 19:01:08','2026-09-01 19:01:08',1,'Autenticação',NULL),(953,36,'Crédito de 90 000,00 MT aprovado para \"Bartolomeu Alfredo Vasco\"',329,'Eliana Munguambe','APROVAR','2026-09-01 19:02:58','2026-09-01 19:02:58',1,'Créditos',NULL),(954,36,'Crédito de 20 000,00 MT aprovado para \"Carlitos Joao Celestino\"',329,'Eliana Munguambe','APROVAR','2026-09-01 19:12:06','2026-09-01 19:12:06',1,'Créditos',NULL),(955,36,'Iracema Muhuai fez login no sistema',354,'Iracema Muhuai','LOGIN','2026-09-01 19:17:27','2026-09-01 19:17:27',3,'Autenticação',NULL),(956,36,'Eliana Munguambe fez login no sistema',329,'Eliana Munguambe','LOGIN','2026-09-01 19:19:36','2026-09-01 19:19:36',1,'Autenticação',NULL),(957,36,'Eliana Munguambe fez logout do sistema',329,'Eliana Munguambe','LOGOUT','2026-09-01 19:25:33','2026-09-01 19:25:33',1,'Autenticação',NULL),(958,36,'Garantia \"Garantia\" registada para \"A sua residencia feita de material precario\"',354,'Iracema Muhuai','CRIAR','2026-09-01 19:27:13','2026-09-01 19:27:13',3,'Garantias',NULL),(959,36,'Garantia \"Garantia\" registada para \"    Gerador industrial de 40KVA, segunda mão\"',354,'Iracema Muhuai','CRIAR','2026-09-01 19:29:32','2026-09-01 19:29:32',3,'Garantias',NULL),(960,36,'Garantia \"Garantia\" registada para \"Um carro Toyota Alphard, AML 485 MC, na cor branca\"',354,'Iracema Muhuai','CRIAR','2026-09-01 19:34:10','2026-09-01 19:34:10',3,'Garantias',NULL),(961,36,'Garantia \"Garantia\" eliminada de \"O interior de uma casa tipo 2\"',354,'Iracema Muhuai','ELIMINAR','2026-09-01 19:36:49','2026-09-01 19:36:49',3,'Garantias',NULL),(962,36,'Garantia \"Garantia\" registada para \"Ema mercearia localizada no bairro de mutiticoma, perto do Frank.\"',354,'Iracema Muhuai','CRIAR','2026-09-01 19:40:47','2026-09-01 19:40:47',3,'Garantias',NULL),(963,36,'Eliana Munguambe fez login no sistema',329,'Eliana Munguambe','LOGIN','2026-09-01 19:59:11','2026-09-01 19:59:11',1,'Autenticação',NULL),(964,36,'Crédito de 100 000,00 MT aprovado para \"Adelino Albino Ali\"',329,'Eliana Munguambe','APROVAR','2026-09-01 20:00:37','2026-09-01 20:00:37',1,'Créditos',NULL),(965,36,'Eliana Munguambe fez login no sistema',329,'Eliana Munguambe','LOGIN','2026-09-01 20:10:21','2026-09-01 20:10:21',1,'Autenticação',NULL),(966,36,'Dados da empresa actualizados: Dados gerais, Logotipo, Meios de pagamento',329,'Eliana Munguambe','EDITAR','2026-09-01 20:12:20','2026-09-01 20:12:20',1,'Configurações',NULL),(967,36,'Dados da empresa actualizados: Dados gerais, Logotipo, Meios de pagamento',329,'Eliana Munguambe','EDITAR','2026-09-01 20:12:33','2026-09-01 20:12:33',1,'Configurações',NULL),(968,36,'Eliana Munguambe fez login no sistema',329,'Eliana Munguambe','LOGIN','2026-09-01 20:13:54','2026-09-01 20:13:54',1,'Autenticação',NULL),(969,36,'Eliana Munguambe fez login no sistema',329,'Eliana Munguambe','LOGIN','2026-09-01 20:14:52','2026-09-01 20:14:52',1,'Autenticação',NULL),(970,36,'Garantia \"Garantia\" eliminada de \"Ema mercearia localizada no bairro de mutiticoma, perto do Frank.\"',329,'Eliana Munguambe','ELIMINAR','2026-09-01 20:17:21','2026-09-01 20:17:21',1,'Garantias',NULL),(971,36,'Garantia \"Garantia\" eliminada de \"Ema mercearia localizada no bairro de mutiticoma, perto do Frank.\"',329,'Eliana Munguambe','ELIMINAR','2026-09-01 20:18:25','2026-09-01 20:18:25',1,'Garantias',NULL),(972,36,'Garantia \"Garantia\" registada para \"Mercearia localizada no mercado de Mutiticoma, perto do Frank\"',329,'Eliana Munguambe','CRIAR','2026-09-01 20:19:35','2026-09-01 20:19:35',1,'Garantias',NULL),(973,36,'Eliana Munguambe fez login no sistema',329,'Eliana Munguambe','LOGIN','2026-09-01 20:38:14','2026-09-01 20:38:14',1,'Autenticação',NULL),(974,36,'Dados da empresa actualizados: Dados gerais, Logotipo, Meios de pagamento',329,'Eliana Munguambe','EDITAR','2026-09-01 20:39:40','2026-09-01 20:39:40',1,'Configurações',NULL),(975,36,'Taxas de juro actualizadas',329,'Eliana Munguambe','CONFIGURAR','2026-09-01 20:40:16','2026-09-01 20:40:16',1,'Taxas de Juro',NULL),(976,36,'Taxas de juro actualizadas',329,'Eliana Munguambe','CONFIGURAR','2026-09-01 20:40:22','2026-09-01 20:40:22',1,'Taxas de Juro',NULL),(977,36,'Iracema Muhuai fez login no sistema',354,'Iracema Muhuai','LOGIN','2026-09-02 05:22:45','2026-09-02 05:22:45',3,'Autenticação',NULL),(978,36,'Eliana Munguambe fez login no sistema',329,'Eliana Munguambe','LOGIN','2026-09-02 05:50:09','2026-09-02 05:50:09',1,'Autenticação',NULL),(979,36,'Crédito de 300 000,00 MT aprovado para \"Marcelino Horacio Jose da Silva\"',329,'Eliana Munguambe','APROVAR','2026-09-02 06:01:53','2026-09-02 06:01:53',1,'Créditos',NULL),(980,36,'Crédito de 150 000,00 MT aprovado para \"Saide Ali Fargi\"',329,'Eliana Munguambe','APROVAR','2026-09-02 06:03:56','2026-09-02 06:03:56',1,'Créditos',NULL),(981,36,'Crédito de 350 000,00 MT aprovado para \"Sergio Zacarias Cossa\"',329,'Eliana Munguambe','APROVAR','2026-09-02 06:05:53','2026-09-02 06:05:53',1,'Créditos',NULL),(982,36,'Crédito de 350 000,00 MT aprovado para \"Jacob Nafital Novela\"',329,'Eliana Munguambe','APROVAR','2026-09-02 06:19:03','2026-09-02 06:19:03',1,'Créditos',NULL),(983,36,'Eliana Munguambe fez login no sistema',329,'Eliana Munguambe','LOGIN','2026-09-02 06:24:57','2026-09-02 06:24:57',1,'Autenticação',NULL),(984,36,'Eliana Munguambe fez login no sistema',329,'Eliana Munguambe','LOGIN','2026-09-02 06:24:57','2026-09-02 06:24:57',1,'Autenticação',NULL),(985,36,'Eliana Munguambe fez logout do sistema',329,'Eliana Munguambe','LOGOUT','2026-09-02 07:03:57','2026-09-02 07:03:57',1,'Autenticação',NULL),(986,36,'Eliana Munguambe fez login no sistema',329,'Eliana Munguambe','LOGIN','2026-09-02 07:10:31','2026-09-02 07:10:31',1,'Autenticação',NULL),(987,36,'Eliana Munguambe fez logout do sistema',329,'Eliana Munguambe','LOGOUT','2026-09-02 07:25:57','2026-09-02 07:25:57',1,'Autenticação',NULL),(988,36,'Eliana Munguambe fez login no sistema',329,'Eliana Munguambe','LOGIN','2026-09-02 07:30:22','2026-09-02 07:30:22',1,'Autenticação',NULL),(989,36,'Eliana Munguambe fez login no sistema',329,'Eliana Munguambe','LOGIN','2026-09-02 14:12:41','2026-09-02 14:12:41',1,'Autenticação',NULL),(990,36,'Iracema Muhuai fez login no sistema',354,'Iracema Muhuai','LOGIN','2026-09-02 14:39:01','2026-09-02 14:39:01',3,'Autenticação',NULL),(991,36,'Eliana Munguambe fez logout do sistema',329,'Eliana Munguambe','LOGOUT','2026-09-02 14:49:05','2026-09-02 14:49:05',1,'Autenticação',NULL),(993,36,'Iracema Muhuai fez login no sistema',354,'Iracema Muhuai','LOGIN','2026-09-03 05:02:31','2026-09-03 05:02:31',3,'Autenticação',NULL),(994,36,'Eliana Munguambe fez login no sistema',329,'Eliana Munguambe','LOGIN','2026-09-03 09:56:18','2026-09-03 09:56:18',1,'Autenticação',NULL),(995,36,'Utilizador \"Iracema Mahuai\" actualizado',329,'Eliana Munguambe','EDITAR','2026-09-03 09:57:32','2026-09-03 09:57:32',1,'Utilizadores',NULL),(996,36,'Eliana Munguambe fez login no sistema',329,'Eliana Munguambe','LOGIN','2026-09-03 10:19:32','2026-09-03 10:19:32',1,'Autenticação',NULL),(997,36,'Crédito de 350 000,00 MT aprovado para \"Jacob Nafital Novela\"',329,'Eliana Munguambe','APROVAR','2026-09-03 10:26:11','2026-09-03 10:26:11',1,'Créditos',NULL),(998,36,'Dados da empresa actualizados: Dados gerais, Logotipo, Meios de pagamento',329,'Eliana Munguambe','EDITAR','2026-09-03 10:29:52','2026-09-03 10:29:52',1,'Configurações',NULL),(999,36,'Garantia \"Garantia\" registada para \"Gerador industrial de 40KVA, segunda mão\"',329,'Eliana Munguambe','CRIAR','2026-09-03 10:30:18','2026-09-03 10:30:18',1,'Garantias',NULL),(1000,36,'Iracema Mahuai fez login no sistema',354,'Iracema Mahuai','LOGIN','2026-09-03 10:46:10','2026-09-03 10:46:10',3,'Autenticação',NULL),(1001,36,'Iracema Mahuai fez logout do sistema',354,'Iracema Mahuai','LOGOUT','2026-09-03 10:57:44','2026-09-03 10:57:44',3,'Autenticação',NULL),(1002,36,'Eliana Munguambe fez login no sistema',329,'Eliana Munguambe','LOGIN','2026-09-03 16:58:04','2026-09-03 16:58:04',1,'Autenticação',NULL),(1003,36,'Eliana Munguambe fez login no sistema',329,'Eliana Munguambe','LOGIN','2026-09-04 15:44:52','2026-09-04 15:44:52',1,'Autenticação',NULL),(1004,36,'Dados da empresa actualizados: Dados gerais, Logotipo, Meios de pagamento, Serviço de SMS',329,'Eliana Munguambe','EDITAR','2026-09-04 15:45:47','2026-09-04 15:45:47',1,'Configurações',NULL),(1005,36,'Eliana Munguambe fez logout do sistema',329,'Eliana Munguambe','LOGOUT','2026-09-04 15:46:40','2026-09-04 15:46:40',1,'Autenticação',NULL),(1006,36,'Eliana Munguambe fez login no sistema',329,'Eliana Munguambe','LOGIN','2026-09-05 07:04:08','2026-09-05 07:04:08',1,'Autenticação',NULL),(1007,36,'Eliana Munguambe fez login no sistema',329,'Eliana Munguambe','LOGIN','2026-09-07 08:43:03','2026-09-07 08:43:03',1,'Autenticação',NULL),(1008,36,'Eliana Munguambe fez logout do sistema',329,'Eliana Munguambe','LOGOUT','2026-09-07 09:02:24','2026-09-07 09:02:24',1,'Autenticação',NULL),(1009,36,'Eliana Munguambe fez login no sistema',329,'Eliana Munguambe','LOGIN','2026-09-08 10:47:21','2026-09-08 10:47:21',1,'Autenticação',NULL),(1010,36,'Eliana Munguambe fez logout do sistema',329,'Eliana Munguambe','LOGOUT','2026-09-08 10:48:10','2026-09-08 10:48:10',1,'Autenticação',NULL),(1011,36,'Iracema Mahuai fez login no sistema',354,'Iracema Mahuai','LOGIN','2026-09-08 10:48:20','2026-09-08 10:48:20',3,'Autenticação',NULL),(1012,36,'Iracema Mahuai fez login no sistema',354,'Iracema Mahuai','LOGIN','2026-09-08 10:54:21','2026-09-08 10:54:21',3,'Autenticação',NULL),(1013,36,'Iracema Mahuai fez logout do sistema',354,'Iracema Mahuai','LOGOUT','2026-09-08 11:01:06','2026-09-08 11:01:06',3,'Autenticação',NULL),(1014,36,'Eliana Munguambe fez login no sistema',329,'Eliana Munguambe','LOGIN','2026-09-08 11:01:40','2026-09-08 11:01:40',1,'Autenticação',NULL),(1015,36,'Eliana Munguambe fez logout do sistema',329,'Eliana Munguambe','LOGOUT','2026-09-08 11:13:47','2026-09-08 11:13:47',1,'Autenticação',NULL),(1016,36,'Eliana Munguambe fez login no sistema',329,'Eliana Munguambe','LOGIN','2026-09-08 13:53:28','2026-09-08 13:53:28',1,'Autenticação',NULL),(1017,36,'Eliana Munguambe fez logout do sistema',329,'Eliana Munguambe','LOGOUT','2026-09-08 14:10:19','2026-09-08 14:10:19',1,'Autenticação',NULL),(1018,36,'Eliana Munguambe fez login no sistema',329,'Eliana Munguambe','LOGIN','2026-09-08 14:22:46','2026-09-08 14:22:46',1,'Autenticação',NULL),(1019,36,'Eliana Munguambe fez logout do sistema',329,'Eliana Munguambe','LOGOUT','2026-09-08 14:34:57','2026-09-08 14:34:57',1,'Autenticação',NULL),(1020,36,'Eliana Munguambe fez login no sistema',329,'Eliana Munguambe','LOGIN','2026-09-08 18:35:54','2026-09-08 18:35:54',1,'Autenticação',NULL),(1021,36,'Eliana Munguambe fez login no sistema',329,'Eliana Munguambe','LOGIN','2026-09-08 23:46:16','2026-09-08 23:46:16',1,'Autenticação',NULL),(1022,36,'Eliana Munguambe fez login no sistema',329,'Eliana Munguambe','LOGIN','2026-09-08 23:46:16','2026-09-08 23:46:16',1,'Autenticação',NULL),(1023,36,'Iracema Mahuai fez login no sistema',354,'Iracema Mahuai','LOGIN','2026-09-09 10:54:27','2026-09-09 10:54:27',3,'Autenticação',NULL),(1024,36,'Iracema Mahuai fez logout do sistema',354,'Iracema Mahuai','LOGOUT','2026-09-09 11:03:15','2026-09-09 11:03:15',3,'Autenticação',NULL),(1025,36,'Eliana Munguambe fez login no sistema',329,'Eliana Munguambe','LOGIN','2026-09-09 11:24:25','2026-09-09 11:24:25',1,'Autenticação',NULL),(1026,36,'Eliana Munguambe fez logout do sistema',329,'Eliana Munguambe','LOGOUT','2026-09-09 11:48:21','2026-09-09 11:48:21',1,'Autenticação',NULL),(1027,36,'Iracema Mahuai fez login no sistema',354,'Iracema Mahuai','LOGIN','2026-09-09 11:48:55','2026-09-09 11:48:55',3,'Autenticação',NULL),(1028,36,'Eliana Munguambe fez login no sistema',329,'Eliana Munguambe','LOGIN','2026-09-09 11:54:19','2026-09-09 11:54:19',1,'Autenticação',NULL),(1029,36,'Iracema Mahuai fez logout do sistema',354,'Iracema Mahuai','LOGOUT','2026-09-09 12:04:21','2026-09-09 12:04:21',3,'Autenticação',NULL),(1030,36,'Eliana Munguambe fez login no sistema',329,'Eliana Munguambe','LOGIN','2026-09-09 12:04:43','2026-09-09 12:04:43',1,'Autenticação',NULL),(1031,36,'Taxas de juro actualizadas',329,'Eliana Munguambe','CONFIGURAR','2026-09-09 12:07:21','2026-09-09 12:07:21',1,'Taxas de Juro',NULL),(1032,36,'Taxas de juro actualizadas',329,'Eliana Munguambe','CONFIGURAR','2026-09-09 12:07:53','2026-09-09 12:07:53',1,'Taxas de Juro',NULL),(1033,36,'Taxas de juro actualizadas',329,'Eliana Munguambe','CONFIGURAR','2026-09-09 12:08:06','2026-09-09 12:08:06',1,'Taxas de Juro',NULL),(1034,36,'Taxas de juro actualizadas',329,'Eliana Munguambe','CONFIGURAR','2026-09-09 12:08:27','2026-09-09 12:08:27',1,'Taxas de Juro',NULL),(1035,36,'Taxas de juro actualizadas',329,'Eliana Munguambe','CONFIGURAR','2026-09-09 12:10:48','2026-09-09 12:10:48',1,'Taxas de Juro',NULL),(1036,36,'Iracema Mahuai fez login no sistema',354,'Iracema Mahuai','LOGIN','2026-09-09 12:13:03','2026-09-09 12:13:03',3,'Autenticação',NULL),(1037,36,'Garantia \"Garantia\" registada para \"Uma viatura de marca Honda CRV AKV 823 MC\"',354,'Iracema Mahuai','CRIAR','2026-09-09 12:26:02','2026-09-09 12:26:02',3,'Garantias',NULL),(1038,36,'Eliana Munguambe fez login no sistema',329,'Eliana Munguambe','LOGIN','2026-09-09 12:27:31','2026-09-09 12:27:31',1,'Autenticação',NULL),(1039,36,'Eliana Munguambe fez login no sistema',329,'Eliana Munguambe','LOGIN','2026-09-09 12:36:03','2026-09-09 12:36:03',1,'Autenticação',NULL),(1040,36,'Crédito de 150 000,00 MZN aprovado para \"Mauro Neto Machatine\"',329,'Eliana Munguambe','APROVAR','2026-09-09 12:37:02','2026-09-09 12:37:02',1,'Créditos',NULL),(1041,36,'Garantia \"Garantia\" registada para \"Uma viatura de marca Honda CRV, AKV 823 MC\"',354,'Iracema Mahuai','CRIAR','2026-09-09 12:43:41','2026-09-09 12:43:41',3,'Garantias',NULL),(1042,36,'Eliana Munguambe fez logout do sistema',329,'Eliana Munguambe','LOGOUT','2026-09-09 13:03:12','2026-09-09 13:03:12',1,'Autenticação',NULL),(1043,36,'Eliana Munguambe fez login no sistema',329,'Eliana Munguambe','LOGIN','2026-09-09 13:37:56','2026-09-09 13:37:56',1,'Autenticação',NULL),(1044,36,'Iracema Mahuai fez login no sistema',354,'Iracema Mahuai','LOGIN','2026-09-09 13:43:34','2026-09-09 13:43:34',3,'Autenticação',NULL),(1045,36,'Eliana Munguambe fez login no sistema',329,'Eliana Munguambe','LOGIN','2026-09-09 13:50:57','2026-09-09 13:50:57',1,'Autenticação',NULL),(1046,36,'Eliana Munguambe fez login no sistema',329,'Eliana Munguambe','LOGIN','2026-09-09 14:54:51','2026-09-09 14:54:51',1,'Autenticação',NULL),(1047,36,'Eliana Munguambe fez login no sistema',329,'Eliana Munguambe','LOGIN','2026-09-09 16:11:19','2026-09-09 16:11:19',1,'Autenticação',NULL),(1048,36,'Iracema Mahuai fez login no sistema',354,'Iracema Mahuai','LOGIN','2026-09-10 07:26:17','2026-09-10 07:26:17',3,'Autenticação',NULL),(1049,36,'Iracema Mahuai fez logout do sistema',354,'Iracema Mahuai','LOGOUT','2026-09-10 07:37:31','2026-09-10 07:37:31',3,'Autenticação',NULL),(1050,36,'Iracema Mahuai fez login no sistema',354,'Iracema Mahuai','LOGIN','2026-09-10 08:29:06','2026-09-10 08:29:06',3,'Autenticação',NULL),(1051,36,'Iracema Mahuai fez logout do sistema',354,'Iracema Mahuai','LOGOUT','2026-09-10 08:53:41','2026-09-10 08:53:41',3,'Autenticação',NULL),(1052,36,'Iracema Mahuai fez login no sistema',354,'Iracema Mahuai','LOGIN','2026-09-10 09:09:04','2026-09-10 09:09:04',3,'Autenticação',NULL),(1053,36,'Garantia \"Garantia\" registada para \"PO\"',354,'Iracema Mahuai','CRIAR','2026-09-10 09:28:23','2026-09-10 09:28:23',3,'Garantias',NULL),(1054,36,'Iracema Mahuai fez logout do sistema',354,'Iracema Mahuai','LOGOUT','2026-09-10 09:42:31','2026-09-10 09:42:31',3,'Autenticação',NULL),(1055,36,'Iracema Mahuai fez login no sistema',354,'Iracema Mahuai','LOGIN','2026-09-10 10:51:23','2026-09-10 10:51:23',3,'Autenticação',NULL),(1056,36,'Iracema Mahuai fez logout do sistema',354,'Iracema Mahuai','LOGOUT','2026-09-10 11:03:08','2026-09-10 11:03:08',3,'Autenticação',NULL),(1057,36,'Eliana Munguambe fez login no sistema',329,'Eliana Munguambe','LOGIN','2026-09-10 17:01:25','2026-09-10 17:01:25',1,'Autenticação',NULL),(1058,36,'Eliana Munguambe fez logout do sistema',329,'Eliana Munguambe','LOGOUT','2026-09-10 17:11:59','2026-09-10 17:11:59',1,'Autenticação',NULL),(1059,36,'Eliana Munguambe fez login no sistema',329,'Eliana Munguambe','LOGIN','2026-09-10 18:14:11','2026-09-10 18:14:11',1,'Autenticação',NULL),(1060,36,'Eliana Munguambe fez login no sistema',329,'Eliana Munguambe','LOGIN','2026-09-11 05:45:34','2026-09-11 05:45:34',1,'Autenticação',NULL),(1061,36,'Eliana Munguambe fez logout do sistema',329,'Eliana Munguambe','LOGOUT','2026-09-11 05:57:17','2026-09-11 05:57:17',1,'Autenticação',NULL),(1062,36,'Eliana Munguambe fez login no sistema',329,'Eliana Munguambe','LOGIN','2026-09-11 06:31:21','2026-09-11 06:31:21',1,'Autenticação',NULL),(1063,36,'Eliana Munguambe fez login no sistema',329,'Eliana Munguambe','LOGIN','2026-09-11 09:22:43','2026-09-11 09:22:43',1,'Autenticação',NULL),(1064,36,'Eliana Munguambe fez logout do sistema',329,'Eliana Munguambe','LOGOUT','2026-09-11 09:36:08','2026-09-11 09:36:08',1,'Autenticação',NULL),(1065,36,'Iracema Mahuai fez login no sistema',354,'Iracema Mahuai','LOGIN','2026-09-11 12:40:05','2026-09-11 12:40:05',3,'Autenticação',NULL),(1066,36,'Eliana Munguambe fez login no sistema',329,'Eliana Munguambe','LOGIN','2026-09-11 12:47:07','2026-09-11 12:47:07',1,'Autenticação',NULL),(1067,36,'Eliana Munguambe fez login no sistema',329,'Eliana Munguambe','LOGIN','2026-09-11 13:03:30','2026-09-11 13:03:30',1,'Autenticação',NULL),(1068,36,'Taxas de juro actualizadas',329,'Eliana Munguambe','CONFIGURAR','2026-09-11 13:05:24','2026-09-11 13:05:24',1,'Taxas de Juro',NULL),(1069,36,'Taxas de juro actualizadas',329,'Eliana Munguambe','CONFIGURAR','2026-09-11 13:06:17','2026-09-11 13:06:17',1,'Taxas de Juro',NULL),(1070,36,'Taxas de juro actualizadas',329,'Eliana Munguambe','CONFIGURAR','2026-09-11 13:09:52','2026-09-11 13:09:52',1,'Taxas de Juro',NULL),(1071,36,'Taxas de juro actualizadas',329,'Eliana Munguambe','CONFIGURAR','2026-09-11 13:10:12','2026-09-11 13:10:12',1,'Taxas de Juro',NULL),(1072,36,'Taxas de juro actualizadas',329,'Eliana Munguambe','CONFIGURAR','2026-09-11 13:10:22','2026-09-11 13:10:22',1,'Taxas de Juro',NULL),(1073,36,'Eliana Munguambe fez logout do sistema',329,'Eliana Munguambe','LOGOUT','2026-09-11 13:13:08','2026-09-11 13:13:08',1,'Autenticação',NULL),(1074,36,'Garantia \"Garantia\" registada para \"Uma casa de 3 quartos, 1 sala, 1 corredor , 2 casas de banho e 1 varanda\"',354,'Iracema Mahuai','CRIAR','2026-09-11 13:37:01','2026-09-11 13:37:01',3,'Garantias',NULL),(1075,36,'Iracema Mahuai fez logout do sistema',354,'Iracema Mahuai','LOGOUT','2026-09-11 13:59:28','2026-09-11 13:59:28',3,'Autenticação',NULL),(1076,36,'Taxas de juro actualizadas',329,'Eliana Munguambe','CONFIGURAR','2026-09-11 14:02:32','2026-09-11 14:02:32',1,'Taxas de Juro',NULL),(1077,36,'Taxas de juro actualizadas',329,'Eliana Munguambe','CONFIGURAR','2026-09-11 14:02:42','2026-09-11 14:02:42',1,'Taxas de Juro',NULL),(1078,36,'Taxas de juro actualizadas',329,'Eliana Munguambe','CONFIGURAR','2026-09-11 14:02:48','2026-09-11 14:02:48',1,'Taxas de Juro',NULL),(1079,36,'Iracema Mahuai fez login no sistema',354,'Iracema Mahuai','LOGIN','2026-09-11 14:08:30','2026-09-11 14:08:30',3,'Autenticação',NULL),(1080,36,'Eliana Munguambe fez login no sistema',329,'Eliana Munguambe','LOGIN','2026-09-11 18:47:34','2026-09-11 18:47:34',1,'Autenticação',NULL),(1081,36,'Eliana Munguambe fez login no sistema',329,'Eliana Munguambe','LOGIN','2026-09-11 18:47:34','2026-09-11 18:47:34',1,'Autenticação',NULL),(1082,36,'Eliana Munguambe fez login no sistema',329,'Eliana Munguambe','LOGIN','2026-09-12 07:57:16','2026-09-12 07:57:16',1,'Autenticação',NULL),(1083,36,'Eliana Munguambe fez login no sistema',329,'Eliana Munguambe','LOGIN','2026-09-12 13:04:51','2026-09-12 13:04:51',1,'Autenticação',NULL),(1084,36,'Eliana Munguambe fez login no sistema',329,'Eliana Munguambe','LOGIN','2026-09-12 13:05:02','2026-09-12 13:05:02',1,'Autenticação',NULL),(1085,36,'Eliana Munguambe fez login no sistema',329,'Eliana Munguambe','LOGIN','2026-09-12 13:08:47','2026-09-12 13:08:47',1,'Autenticação',NULL),(1086,36,'Eliana Munguambe fez logout do sistema',329,'Eliana Munguambe','LOGOUT','2026-09-12 13:09:11','2026-09-12 13:09:11',1,'Autenticação',NULL),(1087,36,'Eliana Munguambe fez login no sistema',329,'Eliana Munguambe','LOGIN','2026-09-12 14:47:53','2026-09-12 14:47:53',1,'Autenticação',NULL),(1088,36,'Eliana Munguambe fez logout do sistema',329,'Eliana Munguambe','LOGOUT','2026-09-12 15:01:23','2026-09-12 15:01:23',1,'Autenticação',NULL),(1089,36,'Eliana Munguambe fez login no sistema',329,'Eliana Munguambe','LOGIN','2026-09-12 15:11:51','2026-09-12 15:11:51',1,'Autenticação',NULL),(1090,36,'Eliana Munguambe fez logout do sistema',329,'Eliana Munguambe','LOGOUT','2026-09-12 15:19:08','2026-09-12 15:19:08',1,'Autenticação',NULL),(1091,36,'Iracema Mahuai fez login no sistema',354,'Iracema Mahuai','LOGIN','2026-09-12 15:19:13','2026-09-12 15:19:13',3,'Autenticação',NULL),(1092,36,'Eliana Munguambe fez login no sistema',329,'Eliana Munguambe','LOGIN','2026-09-14 08:00:38','2026-09-14 08:00:38',1,'Autenticação',NULL),(1093,36,'Iracema Mahuai fez login no sistema',354,'Iracema Mahuai','LOGIN','2026-09-14 08:01:49','2026-09-14 08:01:49',3,'Autenticação',NULL),(1094,36,'Iracema Mahuai fez logout do sistema',354,'Iracema Mahuai','LOGOUT','2026-09-14 08:21:32','2026-09-14 08:21:32',3,'Autenticação',NULL),(1095,36,'Eliana Munguambe fez login no sistema',329,'Eliana Munguambe','LOGIN','2026-09-14 08:21:46','2026-09-14 08:21:46',1,'Autenticação',NULL),(1096,36,'Iracema Mahuai fez login no sistema',354,'Iracema Mahuai','LOGIN','2026-09-14 08:54:05','2026-09-14 08:54:05',3,'Autenticação',NULL),(1097,36,'Eliana Munguambe fez logout do sistema',329,'Eliana Munguambe','LOGOUT','2026-09-14 09:07:38','2026-09-14 09:07:38',1,'Autenticação',NULL),(1098,36,'Eliana Munguambe fez login no sistema',329,'Eliana Munguambe','LOGIN','2026-09-14 09:07:48','2026-09-14 09:07:48',1,'Autenticação',NULL),(1099,36,'Eliana Munguambe fez login no sistema',329,'Eliana Munguambe','LOGIN','2026-09-14 09:13:23','2026-09-14 09:13:23',1,'Autenticação',NULL),(1100,36,'Eliana Munguambe fez logout do sistema',329,'Eliana Munguambe','LOGOUT','2026-09-14 09:15:43','2026-09-14 09:15:43',1,'Autenticação',NULL),(1101,36,'Eliana Munguambe fez logout do sistema',329,'Eliana Munguambe','LOGOUT','2026-09-14 09:23:51','2026-09-14 09:23:51',1,'Autenticação',NULL),(1102,36,'Eliana Munguambe fez login no sistema',329,'Eliana Munguambe','LOGIN','2026-09-14 09:23:57','2026-09-14 09:23:57',1,'Autenticação',NULL),(1105,36,'Eliana Munguambe fez login no sistema',329,'Eliana Munguambe','LOGIN','2026-09-14 11:46:29','2026-09-14 11:46:29',1,'Autenticação',NULL),(1106,36,'Eliana Munguambe fez login no sistema',329,'Eliana Munguambe','LOGIN','2026-09-14 11:53:54','2026-09-14 11:53:54',1,'Autenticação',NULL),(1107,36,'Eliana Munguambe fez login no sistema',329,'Eliana Munguambe','LOGIN','2026-09-14 11:53:54','2026-09-14 11:53:54',1,'Autenticação',NULL),(1108,36,'Eliana Munguambe fez login no sistema',329,'Eliana Munguambe','LOGIN','2026-09-14 13:45:18','2026-09-14 13:45:18',1,'Autenticação',NULL),(1109,36,'Desembolso de 350 000,00 MZN invalidado para \"Jacob Nafital Novela\" (conta 104) — crédito voltou a Pendentes',329,'Eliana Munguambe','INVALIDAR DESEMBOLSO','2026-09-14 13:45:43','2026-09-14 13:45:43',1,'Créditos',NULL),(1110,36,'Desembolso de 350 000,00 MZN invalidado para \"Sergio Zacarias Cossa\" (conta 107) — crédito voltou a Pendentes',329,'Eliana Munguambe','INVALIDAR DESEMBOLSO','2026-09-14 13:45:52','2026-09-14 13:45:52',1,'Créditos',NULL),(1111,36,'Desembolso de 100 000,00 MZN invalidado para \"Adelino Albino Ali\" (conta 100) — crédito voltou a Pendentes',329,'Eliana Munguambe','INVALIDAR DESEMBOLSO','2026-09-14 13:46:01','2026-09-14 13:46:01',1,'Créditos',NULL),(1112,36,'Desembolso de 90 000,00 MZN invalidado para \"Bartolomeu Alfredo Vasco\" (conta 101) — crédito voltou a Pendentes',329,'Eliana Munguambe','INVALIDAR DESEMBOLSO','2026-09-14 13:46:09','2026-09-14 13:46:09',1,'Créditos',NULL),(1113,36,'Desembolso de 150 000,00 MZN invalidado para \"Saide Ali Fargi\" (conta 106) — crédito voltou a Pendentes',329,'Eliana Munguambe','INVALIDAR DESEMBOLSO','2026-09-14 13:46:15','2026-09-14 13:46:15',1,'Créditos',NULL),(1114,36,'Desembolso de 20 000,00 MZN invalidado para \"Carlitos Joao Celestino\" (conta 102) — crédito voltou a Pendentes',329,'Eliana Munguambe','INVALIDAR DESEMBOLSO','2026-09-14 13:46:21','2026-09-14 13:46:21',1,'Créditos',NULL),(1115,36,'Desembolso de 300 000,00 MZN invalidado para \"Marcelino Horacio Jose da Silva\" (conta 105) — crédito voltou a Pendentes',329,'Eliana Munguambe','INVALIDAR DESEMBOLSO','2026-09-14 13:46:27','2026-09-14 13:46:27',1,'Créditos',NULL),(1116,36,'Crédito de 100 000,00 MZN aprovado para \"Adelino Albino Ali\"',329,'Eliana Munguambe','APROVAR','2026-09-14 13:50:41','2026-09-14 13:50:41',1,'Créditos',NULL),(1117,36,'Crédito de 90 000,00 MZN aprovado para \"Bartolomeu Alfredo Vasco\"',329,'Eliana Munguambe','APROVAR','2026-09-14 13:51:10','2026-09-14 13:51:10',1,'Créditos',NULL),(1118,36,'Crédito de 20 000,00 MZN aprovado para \"Carlitos Joao Celestino\"',329,'Eliana Munguambe','APROVAR','2026-09-14 13:51:35','2026-09-14 13:51:35',1,'Créditos',NULL),(1119,36,'Crédito de 300 000,00 MZN aprovado para \"Marcelino Horacio Jose da Silva\"',329,'Eliana Munguambe','APROVAR','2026-09-14 13:52:03','2026-09-14 13:52:03',1,'Créditos',NULL),(1120,36,'Crédito de 150 000,00 MZN aprovado para \"Saide Ali Fargi\"',329,'Eliana Munguambe','APROVAR','2026-09-14 13:53:43','2026-09-14 13:53:43',1,'Créditos',NULL),(1121,36,'Taxas de juro actualizadas',329,'Eliana Munguambe','CONFIGURAR','2026-09-14 14:05:18','2026-09-14 14:05:18',1,'Taxas de Juro',NULL),(1122,36,'Taxas de juro actualizadas',329,'Eliana Munguambe','CONFIGURAR','2026-09-14 14:06:02','2026-09-14 14:06:02',1,'Taxas de Juro',NULL),(1123,36,'Taxas de juro actualizadas',329,'Eliana Munguambe','CONFIGURAR','2026-09-14 14:06:24','2026-09-14 14:06:24',1,'Taxas de Juro',NULL),(1124,36,'Taxas de juro actualizadas',329,'Eliana Munguambe','CONFIGURAR','2026-09-14 14:06:59','2026-09-14 14:06:59',1,'Taxas de Juro',NULL),(1125,36,'Taxas de juro actualizadas',329,'Eliana Munguambe','CONFIGURAR','2026-09-14 14:07:11','2026-09-14 14:07:11',1,'Taxas de Juro',NULL),(1126,36,'Taxas de juro actualizadas',329,'Eliana Munguambe','CONFIGURAR','2026-09-14 14:07:31','2026-09-14 14:07:31',1,'Taxas de Juro',NULL),(1127,36,'Taxas de juro actualizadas',329,'Eliana Munguambe','CONFIGURAR','2026-09-14 14:08:15','2026-09-14 14:08:15',1,'Taxas de Juro',NULL),(1128,36,'Taxas de juro actualizadas',329,'Eliana Munguambe','CONFIGURAR','2026-09-14 14:09:48','2026-09-14 14:09:48',1,'Taxas de Juro',NULL),(1129,36,'Taxas de juro actualizadas',329,'Eliana Munguambe','CONFIGURAR','2026-09-14 14:10:19','2026-09-14 14:10:19',1,'Taxas de Juro',NULL),(1130,36,'Eliana Munguambe fez login no sistema',329,'Eliana Munguambe','LOGIN','2026-09-14 14:26:38','2026-09-14 14:26:38',1,'Autenticação',NULL),(1131,36,'Crédito de 90 000,00 MZN aprovado para \"Eliana Munguambe\"',329,'Eliana Munguambe','APROVAR','2026-09-14 14:34:27','2026-09-14 14:34:27',1,'Créditos',NULL),(1132,36,'Crédito de 7500,00 MZN aprovado para \"Gislene Teresa Majande\"',329,'Eliana Munguambe','APROVAR','2026-09-14 14:55:46','2026-09-14 14:55:46',1,'Créditos',NULL),(1133,36,'Desembolso de 7500,00 MZN invalidado para \"Gislene Teresa Majande\" (conta 108) — crédito voltou a Pendentes',329,'Eliana Munguambe','INVALIDAR DESEMBOLSO','2026-09-14 14:56:00','2026-09-14 14:56:00',1,'Créditos',NULL),(1134,36,'Crédito de 7500,00 MZN aprovado para \"Gislene Teresa Majande\"',329,'Eliana Munguambe','APROVAR','2026-09-14 14:56:28','2026-09-14 14:56:28',1,'Créditos',NULL),(1135,36,'Crédito de 1000,00 MZN aprovado para \"Aleluia Adelaide Munguambe\"',329,'Eliana Munguambe','APROVAR','2026-09-14 15:05:41','2026-09-14 15:05:41',1,'Créditos',NULL),(1136,36,'Crédito de 5650,00 MZN aprovado para \"Mauro Neto Machatine\"',329,'Eliana Munguambe','APROVAR','2026-09-14 15:27:15','2026-09-14 15:27:15',1,'Créditos',NULL),(1137,36,'Eliana Munguambe fez login no sistema',329,'Eliana Munguambe','LOGIN','2026-09-14 16:54:01','2026-09-14 16:54:01',1,'Autenticação',NULL),(1138,36,'Eliana Munguambe fez login no sistema',329,'Eliana Munguambe','LOGIN','2026-09-14 17:06:06','2026-09-14 17:06:06',1,'Autenticação',NULL),(1139,36,'Eliana Munguambe fez logout do sistema',329,'Eliana Munguambe','LOGOUT','2026-09-14 17:20:42','2026-09-14 17:20:42',1,'Autenticação',NULL),(1140,36,'Eliana Munguambe fez login no sistema',329,'Eliana Munguambe','LOGIN','2026-09-15 07:05:19','2026-09-15 07:05:19',1,'Autenticação',NULL),(1141,36,'Iracema Mahuai fez login no sistema',354,'Iracema Mahuai','LOGIN','2026-09-15 07:11:36','2026-09-15 07:11:36',3,'Autenticação',NULL),(1142,36,'Eliana Munguambe fez login no sistema',329,'Eliana Munguambe','LOGIN','2026-09-15 07:48:37','2026-09-15 07:48:37',1,'Autenticação',NULL),(1143,36,'Eliana Munguambe fez login no sistema',329,'Eliana Munguambe','LOGIN','2026-09-15 07:51:01','2026-09-15 07:51:01',1,'Autenticação',NULL),(1144,36,'Eliana Munguambe fez logout do sistema',329,'Eliana Munguambe','LOGOUT','2026-09-15 07:51:08','2026-09-15 07:51:08',1,'Autenticação',NULL),(1145,36,'Eliana Munguambe fez login no sistema',329,'Eliana Munguambe','LOGIN','2026-09-15 07:51:17','2026-09-15 07:51:17',1,'Autenticação',NULL),(1146,36,'Eliana Munguambe fez login no sistema',329,'Eliana Munguambe','LOGIN','2026-09-15 07:55:43','2026-09-15 07:55:43',1,'Autenticação',NULL),(1147,36,'Eliana Munguambe fez logout do sistema',329,'Eliana Munguambe','LOGOUT','2026-09-15 08:12:53','2026-09-15 08:12:53',1,'Autenticação',NULL),(1148,36,'Eliana Munguambe fez logout do sistema',329,'Eliana Munguambe','LOGOUT','2026-09-15 08:12:58','2026-09-15 08:12:58',1,'Autenticação',NULL),(1149,36,'Eliana Munguambe fez login no sistema',329,'Eliana Munguambe','LOGIN','2026-09-15 08:14:34','2026-09-15 08:14:34',1,'Autenticação',NULL),(1150,36,'Eliana Munguambe fez logout do sistema',329,'Eliana Munguambe','LOGOUT','2026-09-15 19:50:24','2026-09-15 19:50:24',1,'Autenticação',NULL),(1151,36,'Eliana Munguambe fez login no sistema',329,'Eliana Munguambe','LOGIN','2026-09-15 19:50:48','2026-09-15 19:50:48',1,'Autenticação',NULL),(1152,36,'Eliana Munguambe fez logout do sistema',329,'Eliana Munguambe','LOGOUT','2026-09-15 20:00:38','2026-09-15 20:00:38',1,'Autenticação',NULL),(1153,36,'Eliana Munguambe fez login no sistema',329,'Eliana Munguambe','LOGIN','2026-09-17 14:02:09','2026-09-17 14:02:09',1,'Autenticação',NULL),(1154,36,'Eliana Munguambe fez logout do sistema',329,'Eliana Munguambe','LOGOUT','2026-09-17 14:29:11','2026-09-17 14:29:11',1,'Autenticação',NULL),(1155,36,'Iracema Mahuai fez login no sistema',354,'Iracema Mahuai','LOGIN','2026-09-18 07:29:38','2026-09-18 07:29:38',3,'Autenticação',NULL),(1156,36,'Iracema Mahuai fez logout do sistema',354,'Iracema Mahuai','LOGOUT','2026-09-18 07:31:25','2026-09-18 07:31:25',3,'Autenticação',NULL),(1157,36,'Eliana Munguambe fez login no sistema',329,'Eliana Munguambe','LOGIN','2026-09-18 07:31:44','2026-09-18 07:31:44',1,'Autenticação',NULL),(1158,36,'Eliana Munguambe fez login no sistema',329,'Eliana Munguambe','LOGIN','2026-09-18 09:35:24','2026-09-18 09:35:24',1,'Autenticação',NULL),(1159,36,'Eliana Munguambe fez logout do sistema',329,'Eliana Munguambe','LOGOUT','2026-09-18 10:36:28','2026-09-18 10:36:28',1,'Autenticação',NULL),(1160,36,'Eliana Munguambe fez login no sistema',329,'Eliana Munguambe','LOGIN','2026-09-18 12:05:17','2026-09-18 12:05:17',1,'Autenticação',NULL),(1161,36,'Eliana Munguambe fez login no sistema',329,'Eliana Munguambe','LOGIN','2026-09-18 12:23:03','2026-09-18 12:23:03',1,'Autenticação',NULL),(1162,36,'Eliana Munguambe fez login no sistema',329,'Eliana Munguambe','LOGIN','2026-09-18 12:46:58','2026-09-18 12:46:58',1,'Autenticação',NULL),(1163,36,'Eliana Munguambe fez logout do sistema',329,'Eliana Munguambe','LOGOUT','2026-09-18 12:56:04','2026-09-18 12:56:04',1,'Autenticação',NULL),(1164,36,'Eliana Munguambe fez logout do sistema',329,'Eliana Munguambe','LOGOUT','2026-09-18 12:58:03','2026-09-18 12:58:03',1,'Autenticação',NULL),(1165,36,'Iracema Mahuai fez login no sistema',354,'Iracema Mahuai','LOGIN','2026-09-18 12:59:32','2026-09-18 12:59:32',3,'Autenticação',NULL),(1166,36,'Iracema Mahuai fez logout do sistema',354,'Iracema Mahuai','LOGOUT','2026-09-18 12:59:57','2026-09-18 12:59:57',3,'Autenticação',NULL),(1167,36,'Eliana Munguambe fez login no sistema',329,'Eliana Munguambe','LOGIN','2026-09-18 13:00:18','2026-09-18 13:00:18',1,'Autenticação',NULL),(1168,36,'Eliana Munguambe fez logout do sistema',329,'Eliana Munguambe','LOGOUT','2026-09-18 13:35:58','2026-09-18 13:35:58',1,'Autenticação',NULL),(1169,36,'Eliana Munguambe fez login no sistema',329,'Eliana Munguambe','LOGIN','2026-09-18 13:45:17','2026-09-18 13:45:17',1,'Autenticação',NULL),(1170,36,'Eliana Munguambe fez logout do sistema',329,'Eliana Munguambe','LOGOUT','2026-09-18 14:08:14','2026-09-18 14:08:14',1,'Autenticação',NULL),(1171,36,'Eliana Munguambe fez login no sistema',329,'Eliana Munguambe','LOGIN','2026-09-19 07:22:07','2026-09-19 07:22:07',1,'Autenticação',NULL),(1172,36,'Eliana Munguambe fez login no sistema',329,'Eliana Munguambe','LOGIN','2026-09-21 07:03:18','2026-09-21 07:03:18',1,'Autenticação',NULL),(1173,36,'Eliana Munguambe fez login no sistema',329,'Eliana Munguambe','LOGIN','2026-09-21 07:03:18','2026-09-21 07:03:18',1,'Autenticação',NULL),(1174,36,'Eliana Munguambe fez login no sistema',329,'Eliana Munguambe','LOGIN','2026-09-21 07:27:14','2026-09-21 07:27:14',1,'Autenticação',NULL),(1175,36,'Eliana Munguambe fez logout do sistema',329,'Eliana Munguambe','LOGOUT','2026-09-21 09:30:34','2026-09-21 09:30:34',1,'Autenticação',NULL),(1176,36,'Eliana Munguambe fez login no sistema',329,'Eliana Munguambe','LOGIN','2026-09-21 09:47:10','2026-09-21 09:47:10',1,'Autenticação',NULL),(1177,36,'Eliana Munguambe fez login no sistema',329,'Eliana Munguambe','LOGIN','2026-09-21 10:06:40','2026-09-21 10:06:40',1,'Autenticação',NULL),(1178,36,'Eliana Munguambe fez logout do sistema',329,'Eliana Munguambe','LOGOUT','2026-09-21 12:26:26','2026-09-21 12:26:26',1,'Autenticação',NULL),(1179,36,'Eliana Munguambe fez login no sistema',329,'Eliana Munguambe','LOGIN','2026-09-21 12:46:40','2026-09-21 12:46:40',1,'Autenticação',NULL),(1180,36,'Eliana Munguambe fez login no sistema',329,'Eliana Munguambe','LOGIN','2026-09-22 08:09:16','2026-09-22 08:09:16',1,'Autenticação',NULL),(1181,36,'Eliana Munguambe fez logout do sistema',329,'Eliana Munguambe','LOGOUT','2026-09-22 08:35:37','2026-09-22 08:35:37',1,'Autenticação',NULL),(1182,36,'Eliana Munguambe fez login no sistema',329,'Eliana Munguambe','LOGIN','2026-09-23 07:54:45','2026-09-23 07:54:45',1,'Autenticação',NULL),(1183,36,'Iracema Mahuai fez login no sistema',354,'Iracema Mahuai','LOGIN','2026-09-23 07:55:23','2026-09-23 07:55:23',3,'Autenticação',NULL),(1184,36,'Eliana Munguambe fez logout do sistema',329,'Eliana Munguambe','LOGOUT','2026-09-23 09:58:35','2026-09-23 09:58:35',1,'Autenticação',NULL),(1185,36,'Iracema Mahuai fez login no sistema',354,'Iracema Mahuai','LOGIN','2026-09-23 10:35:03','2026-09-23 10:35:03',3,'Autenticação',NULL),(1186,36,'Iracema Mahuai fez logout do sistema',354,'Iracema Mahuai','LOGOUT','2026-09-23 10:45:55','2026-09-23 10:45:55',3,'Autenticação',NULL),(1187,36,'Eliana Munguambe fez login no sistema',329,'Eliana Munguambe','LOGIN','2026-09-23 13:49:20','2026-09-23 13:49:20',1,'Autenticação',NULL),(1188,36,'Eliana Munguambe fez login no sistema',329,'Eliana Munguambe','LOGIN','2026-09-25 15:24:18','2026-09-25 15:24:18',1,'Autenticação',NULL),(1189,36,'Taxas de juro actualizadas',329,'Eliana Munguambe','CONFIGURAR','2026-09-25 15:30:09','2026-09-25 15:30:09',1,'Taxas de Juro',NULL),(1190,36,'Taxas de juro actualizadas',329,'Eliana Munguambe','CONFIGURAR','2026-09-25 15:30:28','2026-09-25 15:30:28',1,'Taxas de Juro',NULL),(1191,36,'Taxas de juro actualizadas',329,'Eliana Munguambe','CONFIGURAR','2026-09-25 15:30:43','2026-09-25 15:30:43',1,'Taxas de Juro',NULL),(1192,36,'Taxas de juro actualizadas',329,'Eliana Munguambe','CONFIGURAR','2026-09-25 15:31:00','2026-09-25 15:31:00',1,'Taxas de Juro',NULL),(1193,36,'Taxas de juro actualizadas',329,'Eliana Munguambe','CONFIGURAR','2026-09-25 15:31:23','2026-09-25 15:31:23',1,'Taxas de Juro',NULL),(1194,36,'Taxas de juro actualizadas',329,'Eliana Munguambe','CONFIGURAR','2026-09-25 15:31:56','2026-09-25 15:31:56',1,'Taxas de Juro',NULL),(1195,36,'Taxas de juro actualizadas',329,'Eliana Munguambe','CONFIGURAR','2026-09-25 15:32:12','2026-09-25 15:32:12',1,'Taxas de Juro',NULL),(1196,36,'Eliana Munguambe fez login no sistema',329,'Eliana Munguambe','LOGIN','2026-09-25 15:45:05','2026-09-25 15:45:05',1,'Autenticação',NULL),(1197,36,'Eliana Munguambe fez login no sistema',329,'Eliana Munguambe','LOGIN','2026-09-25 15:45:05','2026-09-25 15:45:05',1,'Autenticação',NULL),(1198,36,'Eliana Munguambe fez login no sistema',329,'Eliana Munguambe','LOGIN','2026-09-28 07:59:08','2026-09-28 07:59:08',1,'Autenticação',NULL),(1199,36,'Eliana Munguambe fez login no sistema',329,'Eliana Munguambe','LOGIN','2026-09-28 08:36:21','2026-09-28 08:36:21',1,'Autenticação',NULL),(1200,36,'Eliana Munguambe fez login no sistema',329,'Eliana Munguambe','LOGIN','2026-09-28 10:32:12','2026-09-28 10:32:12',1,'Autenticação',NULL),(1201,36,'Iracema Mahuai fez login no sistema',354,'Iracema Mahuai','LOGIN','2026-09-28 10:32:22','2026-09-28 10:32:22',3,'Autenticação',NULL),(1202,36,'Eliana Munguambe fez logout do sistema',329,'Eliana Munguambe','LOGOUT','2026-09-28 11:02:21','2026-09-28 11:02:21',1,'Autenticação',NULL),(1203,36,'Eliana Munguambe fez login no sistema',329,'Eliana Munguambe','LOGIN','2026-09-28 11:31:41','2026-09-28 11:31:41',1,'Autenticação',NULL),(1204,36,'Eliana Munguambe fez logout do sistema',329,'Eliana Munguambe','LOGOUT','2026-09-28 11:48:11','2026-09-28 11:48:11',1,'Autenticação',NULL),(1205,36,'Eliana Munguambe fez login no sistema',329,'Eliana Munguambe','LOGIN','2026-09-28 12:21:39','2026-09-28 12:21:39',1,'Autenticação',NULL),(1206,36,'Iracema Mahuai fez login no sistema',354,'Iracema Mahuai','LOGIN','2026-09-28 21:14:55','2026-09-28 21:14:55',3,'Autenticação',NULL),(1207,36,'Iracema Mahuai fez logout do sistema',354,'Iracema Mahuai','LOGOUT','2026-09-28 21:17:18','2026-09-28 21:17:18',3,'Autenticação',NULL),(1208,36,'Eliana Munguambe fez login no sistema',329,'Eliana Munguambe','LOGIN','2026-09-29 09:16:19','2026-09-29 09:16:19',1,'Autenticação',NULL),(1209,36,'Eliana Munguambe fez login no sistema',329,'Eliana Munguambe','LOGIN','2026-09-29 09:26:43','2026-09-29 09:26:43',1,'Autenticação',NULL),(1210,36,'Eliana Munguambe fez login no sistema',329,'Eliana Munguambe','LOGIN','2026-09-29 09:37:11','2026-09-29 09:37:11',1,'Autenticação',NULL),(1211,36,'Eliana Munguambe fez logout do sistema',329,'Eliana Munguambe','LOGOUT','2026-09-29 09:40:51','2026-09-29 09:40:51',1,'Autenticação',NULL),(1212,36,'João KMAD fez login no sistema',356,'João KMAD','LOGIN','2026-09-29 09:51:04','2026-09-29 09:51:04',4,'Autenticação',NULL),(1213,36,'João KMAD fez logout do sistema',356,'João KMAD','LOGOUT','2026-09-29 09:53:52','2026-09-29 09:53:52',4,'Autenticação',NULL),(1214,36,'Eliana Munguambe fez login no sistema',329,'Eliana Munguambe','LOGIN','2026-09-29 09:54:00','2026-09-29 09:54:00',1,'Autenticação',NULL),(1215,36,'Eliana Munguambe fez logout do sistema',329,'Eliana Munguambe','LOGOUT','2026-09-29 10:40:04','2026-09-29 10:40:04',1,'Autenticação',NULL),(1216,36,'Eliana Munguambe fez login no sistema',329,'Eliana Munguambe','LOGIN','2026-09-29 11:14:36','2026-09-29 11:14:36',1,'Autenticação',NULL),(1217,36,'Iracema Mahuai fez login no sistema',354,'Iracema Mahuai','LOGIN','2026-09-29 13:09:49','2026-09-29 13:09:49',3,'Autenticação',NULL),(1218,36,'Iracema Mahuai fez login no sistema',354,'Iracema Mahuai','LOGIN','2026-09-30 10:35:56','2026-09-30 10:35:56',3,'Autenticação',NULL),(1219,36,'Eliana Munguambe fez login no sistema',329,'Eliana Munguambe','LOGIN','2026-09-30 10:48:11','2026-09-30 10:48:11',1,'Autenticação',NULL),(1220,36,'Eliana Munguambe fez logout do sistema',329,'Eliana Munguambe','LOGOUT','2026-09-30 11:19:44','2026-09-30 11:19:44',1,'Autenticação',NULL),(1221,36,'Eliana Munguambe fez login no sistema',329,'Eliana Munguambe','LOGIN','2026-10-01 13:18:00','2026-10-01 13:18:00',1,'Autenticação',NULL),(1222,36,'Eliana Munguambe fez login no sistema',329,'Eliana Munguambe','LOGIN','2026-10-01 16:24:19','2026-10-01 16:24:19',1,'Autenticação',NULL),(1223,36,'Eliana Munguambe fez logout do sistema',329,'Eliana Munguambe','LOGOUT','2026-10-01 16:35:16','2026-10-01 16:35:16',1,'Autenticação',NULL),(1224,36,'Eliana Munguambe fez login no sistema',329,'Eliana Munguambe','LOGIN','2026-10-01 20:28:41','2026-10-01 20:28:41',1,'Autenticação',NULL),(1225,36,'Eliana Munguambe fez login no sistema',329,'Eliana Munguambe','LOGIN','2026-10-02 06:04:18','2026-10-02 06:04:18',1,'Autenticação',NULL),(1226,36,'Eliana Munguambe fez logout do sistema',329,'Eliana Munguambe','LOGOUT','2026-10-02 06:16:59','2026-10-02 06:16:59',1,'Autenticação',NULL),(1227,36,'Eliana Munguambe fez login no sistema',329,'Eliana Munguambe','LOGIN','2026-10-02 07:45:06','2026-10-02 07:45:06',1,'Autenticação',NULL),(1228,36,'Eliana Munguambe fez logout do sistema',329,'Eliana Munguambe','LOGOUT','2026-10-02 07:57:40','2026-10-02 07:57:40',1,'Autenticação',NULL),(1229,36,'Iracema Mahuai fez login no sistema',354,'Iracema Mahuai','LOGIN','2026-10-02 08:14:34','2026-10-02 08:14:34',3,'Autenticação',NULL),(1230,36,'Eliana Munguambe fez login no sistema',329,'Eliana Munguambe','LOGIN','2026-10-02 08:18:49','2026-10-02 08:18:49',1,'Autenticação',NULL),(1231,36,'Iracema Mahuai fez logout do sistema',354,'Iracema Mahuai','LOGOUT','2026-10-02 08:19:48','2026-10-02 08:19:48',3,'Autenticação',NULL),(1232,36,'Eliana Munguambe fez login no sistema',329,'Eliana Munguambe','LOGIN','2026-10-02 08:19:53','2026-10-02 08:19:53',1,'Autenticação',NULL),(1233,36,'Eliana Munguambe fez logout do sistema',329,'Eliana Munguambe','LOGOUT','2026-10-02 08:45:30','2026-10-02 08:45:30',1,'Autenticação',NULL),(1234,36,'Eliana Munguambe fez logout do sistema',329,'Eliana Munguambe','LOGOUT','2026-10-02 08:49:17','2026-10-02 08:49:17',1,'Autenticação',NULL),(1235,36,'Iracema Mahuai fez login no sistema',354,'Iracema Mahuai','LOGIN','2026-10-02 09:00:40','2026-10-02 09:00:40',3,'Autenticação',NULL),(1236,36,'Iracema Mahuai fez login no sistema',354,'Iracema Mahuai','LOGIN','2026-10-02 09:01:07','2026-10-02 09:01:07',3,'Autenticação',NULL),(1237,36,'Iracema Mahuai fez login no sistema',354,'Iracema Mahuai','LOGIN','2026-10-02 09:01:16','2026-10-02 09:01:16',3,'Autenticação',NULL),(1238,36,'Iracema Mahuai fez login no sistema',354,'Iracema Mahuai','LOGIN','2026-10-02 09:01:24','2026-10-02 09:01:24',3,'Autenticação',NULL),(1239,36,'Iracema Mahuai fez login no sistema',354,'Iracema Mahuai','LOGIN','2026-10-02 09:01:33','2026-10-02 09:01:33',3,'Autenticação',NULL),(1240,36,'Iracema Mahuai fez login no sistema',354,'Iracema Mahuai','LOGIN','2026-10-02 09:01:59','2026-10-02 09:01:59',3,'Autenticação',NULL),(1241,36,'Iracema Mahuai fez login no sistema',354,'Iracema Mahuai','LOGIN','2026-10-02 09:02:07','2026-10-02 09:02:07',3,'Autenticação',NULL),(1242,36,'Iracema Mahuai fez login no sistema',354,'Iracema Mahuai','LOGIN','2026-10-02 09:04:55','2026-10-02 09:04:55',3,'Autenticação',NULL),(1243,36,'Iracema Mahuai fez logout do sistema',354,'Iracema Mahuai','LOGOUT','2026-10-02 09:38:48','2026-10-02 09:38:48',3,'Autenticação',NULL),(1244,36,'Eliana Munguambe fez login no sistema',329,'Eliana Munguambe','LOGIN','2026-10-02 10:07:30','2026-10-02 10:07:30',1,'Autenticação',NULL),(1245,36,'Eliana Munguambe fez login no sistema',329,'Eliana Munguambe','LOGIN','2026-10-02 10:07:52','2026-10-02 10:07:52',1,'Autenticação',NULL),(1246,36,'Eliana Munguambe fez login no sistema',329,'Eliana Munguambe','LOGIN','2026-10-02 10:08:32','2026-10-02 10:08:32',1,'Autenticação',NULL),(1247,36,'Eliana Munguambe fez login no sistema',329,'Eliana Munguambe','LOGIN','2026-10-02 10:08:51','2026-10-02 10:08:51',1,'Autenticação',NULL),(1248,36,'Iracema Mahuai fez login no sistema',354,'Iracema Mahuai','LOGIN','2026-10-02 12:18:32','2026-10-02 12:18:32',3,'Autenticação',NULL),(1249,36,'Iracema Mahuai fez logout do sistema',354,'Iracema Mahuai','LOGOUT','2026-10-02 12:18:49','2026-10-02 12:18:49',3,'Autenticação',NULL),(1250,36,'Eliana Munguambe fez login no sistema',329,'Eliana Munguambe','LOGIN','2026-10-02 12:19:04','2026-10-02 12:19:04',1,'Autenticação',NULL),(1251,36,'Eliana Munguambe fez logout do sistema',329,'Eliana Munguambe','LOGOUT','2026-10-02 12:41:45','2026-10-02 12:41:45',1,'Autenticação',NULL),(1252,36,'Eliana Munguambe fez login no sistema',329,'Eliana Munguambe','LOGIN','2026-10-02 12:59:43','2026-10-02 12:59:43',1,'Autenticação',NULL),(1253,36,'Eliana Munguambe fez login no sistema',329,'Eliana Munguambe','LOGIN','2026-10-02 13:52:24','2026-10-02 13:52:24',1,'Autenticação',NULL),(1254,36,'Eliana Munguambe fez logout do sistema',329,'Eliana Munguambe','LOGOUT','2026-10-02 14:06:27','2026-10-02 14:06:27',1,'Autenticação',NULL),(1255,36,'Eliana Munguambe fez login no sistema',329,'Eliana Munguambe','LOGIN','2026-10-03 16:14:17','2026-10-03 16:14:17',1,'Autenticação',NULL),(1267,36,'Eliana Munguambe fez login no sistema',329,'Eliana Munguambe','LOGIN','2026-10-04 09:01:11','2026-10-04 09:01:11',1,'Autenticação',NULL),(1268,36,'Iracema Mahuai fez login no sistema',354,'Iracema Mahuai','LOGIN','2026-10-06 07:34:08','2026-10-06 07:34:08',3,'Autenticação',NULL),(1269,36,'Iracema Mahuai fez logout do sistema',354,'Iracema Mahuai','LOGOUT','2026-10-06 08:06:20','2026-10-06 08:06:20',3,'Autenticação',NULL),(1270,36,'Eliana Munguambe fez login no sistema',329,'Eliana Munguambe','LOGIN','2026-10-06 08:10:45','2026-10-06 08:10:45',1,'Autenticação',NULL),(1271,36,'Eliana Munguambe fez logout do sistema',329,'Eliana Munguambe','LOGOUT','2026-10-06 09:11:17','2026-10-06 09:11:17',1,'Autenticação',NULL),(1272,36,'Eliana Munguambe fez login no sistema',329,'Eliana Munguambe','LOGIN','2026-10-06 11:17:41','2026-10-06 11:17:41',1,'Autenticação',NULL),(1273,36,'Eliana Munguambe fez login no sistema',329,'Eliana Munguambe','LOGIN','2026-10-06 11:42:28','2026-10-06 11:42:28',1,'Autenticação',NULL),(1274,36,'Eliana Munguambe fez logout do sistema',329,'Eliana Munguambe','LOGOUT','2026-10-06 11:58:37','2026-10-06 11:58:37',1,'Autenticação',NULL),(1275,36,'Eliana Munguambe fez logout do sistema',329,'Eliana Munguambe','LOGOUT','2026-10-06 12:03:31','2026-10-06 12:03:31',1,'Autenticação',NULL),(1276,36,'Eliana Munguambe fez login no sistema',329,'Eliana Munguambe','LOGIN','2026-10-06 12:21:35','2026-10-06 12:21:35',1,'Autenticação',NULL),(1277,36,'Eliana Munguambe fez login no sistema',329,'Eliana Munguambe','LOGIN','2026-10-06 12:27:20','2026-10-06 12:27:20',1,'Autenticação',NULL),(1278,36,'Eliana Munguambe fez login no sistema',329,'Eliana Munguambe','LOGIN','2026-10-06 14:24:34','2026-10-06 14:24:34',1,'Autenticação',NULL),(1279,36,'Eliana Munguambe fez login no sistema',329,'Eliana Munguambe','LOGIN','2026-10-06 14:24:42','2026-10-06 14:24:42',1,'Autenticação',NULL),(1280,36,'Eliana Munguambe fez login no sistema',329,'Eliana Munguambe','LOGIN','2026-10-07 16:17:44','2026-10-07 16:17:44',1,'Autenticação',NULL),(1281,36,'Eliana Munguambe fez logout do sistema',329,'Eliana Munguambe','LOGOUT','2026-10-07 16:27:58','2026-10-07 16:27:58',1,'Autenticação',NULL),(1282,36,'Eliana Munguambe fez login no sistema',329,'Eliana Munguambe','LOGIN','2026-10-08 10:04:47','2026-10-08 10:04:47',1,'Autenticação',NULL),(1283,36,'Eliana Munguambe fez login no sistema',329,'Eliana Munguambe','LOGIN','2026-10-10 17:41:54','2026-10-10 17:41:54',1,'Autenticação',NULL),(1284,36,'Iracema Mahuai fez login no sistema',354,'Iracema Mahuai','LOGIN','2026-10-12 10:03:17','2026-10-12 10:03:17',3,'Autenticação',NULL),(1285,36,'Iracema Mahuai fez logout do sistema',354,'Iracema Mahuai','LOGOUT','2026-10-12 10:23:32','2026-10-12 10:23:32',3,'Autenticação',NULL),(1286,36,'Eliana Munguambe fez login no sistema',329,'Eliana Munguambe','LOGIN','2026-10-12 10:23:58','2026-10-12 10:23:58',1,'Autenticação',NULL),(1287,36,'Eliana Munguambe fez login no sistema',329,'Eliana Munguambe','LOGIN','2026-10-12 10:24:22','2026-10-12 10:24:22',1,'Autenticação',NULL),(1288,36,'Eliana Munguambe fez logout do sistema',329,'Eliana Munguambe','LOGOUT','2026-10-12 10:34:46','2026-10-12 10:34:46',1,'Autenticação',NULL),(1289,36,'Iracema Mahuai fez login no sistema',354,'Iracema Mahuai','LOGIN','2026-10-12 11:41:55','2026-10-12 11:41:55',3,'Autenticação',NULL),(1290,36,'Iracema Mahuai fez logout do sistema',354,'Iracema Mahuai','LOGOUT','2026-10-12 12:51:09','2026-10-12 12:51:09',3,'Autenticação',NULL),(1291,36,'Iracema Mahuai fez login no sistema',354,'Iracema Mahuai','LOGIN','2026-10-12 12:56:46','2026-10-12 12:56:46',3,'Autenticação',NULL),(1292,36,'Iracema Mahuai fez logout do sistema',354,'Iracema Mahuai','LOGOUT','2026-10-12 13:14:18','2026-10-12 13:14:18',3,'Autenticação',NULL),(1293,36,'Iracema Mahuai fez login no sistema',354,'Iracema Mahuai','LOGIN','2026-10-12 13:39:45','2026-10-12 13:39:45',3,'Autenticação',NULL),(1294,36,'Eliana Munguambe fez login no sistema',329,'Eliana Munguambe','LOGIN','2026-10-12 13:55:27','2026-10-12 13:55:27',1,'Autenticação',NULL),(1295,36,'Eliana Munguambe fez logout do sistema',329,'Eliana Munguambe','LOGOUT','2026-10-12 13:56:09','2026-10-12 13:56:09',1,'Autenticação',NULL),(1296,36,'Iracema Mahuai fez login no sistema',354,'Iracema Mahuai','LOGIN','2026-10-12 13:56:37','2026-10-12 13:56:37',3,'Autenticação',NULL),(1297,36,'Iracema Mahuai fez logout do sistema',354,'Iracema Mahuai','LOGOUT','2026-10-12 14:21:18','2026-10-12 14:21:18',3,'Autenticação',NULL),(1298,36,'Iracema Mahuai fez login no sistema',354,'Iracema Mahuai','LOGIN','2026-10-12 14:29:00','2026-10-12 14:29:00',3,'Autenticação',NULL),(1299,36,'Iracema Mahuai fez logout do sistema',354,'Iracema Mahuai','LOGOUT','2026-10-12 14:40:18','2026-10-12 14:40:18',3,'Autenticação',NULL),(1300,36,'Iracema Mahuai fez login no sistema',354,'Iracema Mahuai','LOGIN','2026-10-12 14:47:27','2026-10-12 14:47:27',3,'Autenticação',NULL),(1301,36,'Iracema Mahuai fez logout do sistema',354,'Iracema Mahuai','LOGOUT','2026-10-12 14:49:49','2026-10-12 14:49:49',3,'Autenticação',NULL),(1302,36,'Eliana Munguambe fez login no sistema',329,'Eliana Munguambe','LOGIN','2026-10-12 14:50:04','2026-10-12 14:50:04',1,'Autenticação',NULL),(1303,36,'Iracema Mahuai fez login no sistema',354,'Iracema Mahuai','LOGIN','2026-10-12 15:24:47','2026-10-12 15:24:47',3,'Autenticação',NULL),(1304,36,'Iracema Mahuai fez logout do sistema',354,'Iracema Mahuai','LOGOUT','2026-10-12 15:26:57','2026-10-12 15:26:57',3,'Autenticação',NULL),(1305,36,'Eliana Munguambe fez login no sistema',329,'Eliana Munguambe','LOGIN','2026-10-12 15:27:12','2026-10-12 15:27:12',1,'Autenticação',NULL),(1306,36,'Iracema Mahuai fez login no sistema',354,'Iracema Mahuai','LOGIN','2026-10-13 09:21:17','2026-10-13 09:21:17',3,'Autenticação',NULL),(1307,36,'Iracema Mahuai fez logout do sistema',354,'Iracema Mahuai','LOGOUT','2026-10-13 09:37:15','2026-10-13 09:37:15',3,'Autenticação',NULL),(1308,36,'Iracema Mahuai fez login no sistema',354,'Iracema Mahuai','LOGIN','2026-10-15 11:20:52','2026-10-15 11:20:52',3,'Autenticação',NULL),(1309,36,'Iracema Mahuai fez logout do sistema',354,'Iracema Mahuai','LOGOUT','2026-10-15 11:22:44','2026-10-15 11:22:44',3,'Autenticação',NULL),(1310,36,'Eliana Munguambe fez login no sistema',329,'Eliana Munguambe','LOGIN','2026-10-15 11:23:17','2026-10-15 11:23:17',1,'Autenticação',NULL),(1311,36,'Eliana Munguambe fez login no sistema',329,'Eliana Munguambe','LOGIN','2026-10-15 14:29:45','2026-10-15 14:29:45',1,'Autenticação',NULL),(1312,36,'Iracema Mahuai fez login no sistema',354,'Iracema Mahuai','LOGIN','2026-10-16 07:05:44','2026-10-16 07:05:44',3,'Autenticação',NULL),(1313,36,'Iracema Mahuai fez login no sistema',354,'Iracema Mahuai','LOGIN','2026-10-16 08:05:19','2026-10-16 08:05:19',3,'Autenticação',NULL),(1314,36,'Iracema Mahuai fez login no sistema',354,'Iracema Mahuai','LOGIN','2026-10-16 11:24:10','2026-10-16 11:24:10',3,'Autenticação',NULL),(1320,36,'Eliana Munguambe fez login no sistema',329,'Eliana Munguambe','LOGIN','2026-10-17 14:31:00','2026-10-17 14:31:00',1,'Autenticação',NULL),(1321,36,'Eliana Munguambe fez logout do sistema',329,'Eliana Munguambe','LOGOUT','2026-10-17 14:41:33','2026-10-17 14:41:33',1,'Autenticação',NULL),(1322,36,'Eliana Munguambe fez login no sistema',329,'Eliana Munguambe','LOGIN','2026-10-17 14:50:33','2026-10-17 14:50:33',1,'Autenticação',NULL),(1341,36,'Eliana Munguambe fez login no sistema',329,'Eliana Munguambe','LOGIN','2026-10-22 06:51:54','2026-10-22 06:51:54',1,'Autenticação',NULL);
/*!40000 ALTER TABLE `user_logs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  `updatedPassword` int(11) NOT NULL,
  `phone` varchar(255) NOT NULL,
  `companyId` int(11) NOT NULL,
  `status` int(11) NOT NULL,
  `userRole` int(11) NOT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `credentialsSent` int(11) DEFAULT 0,
  `credentialsSentAt` varchar(255) DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `walletId` int(11) DEFAULT NULL,
  `is_parceiro` tinyint(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `fk_users_company` (`companyId`),
  KEY `idx_users_walletId` (`walletId`),
  CONSTRAINT `fk_users_company` FOREIGN KEY (`companyId`) REFERENCES `companies` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `fk_users_wallet` FOREIGN KEY (`walletId`) REFERENCES `financing_wallets` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=358 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (15,'Leonel Matsinhe','leonelmatsinhe@gmail.com','$2a$10$idooS.vcteQyi.att6vcFuIFfsoRRcJa9e7.OeDxjYVD1FojEGUha',1,'258850740202',2,1,0,'2022-10-11 18:28:14','2025-01-19 10:05:06',0,NULL,1,NULL,0),(329,'Eliana Munguambe','mbr@gmail.com','$2a$10$idooS.vcteQyi.att6vcFuIFfsoRRcJa9e7.OeDxjYVD1FojEGUha',1,'258842678869',36,1,1,'2025-01-24 20:27:31','2026-09-03 11:07:06',0,NULL,1,NULL,0),(354,'Iracema Mahuai','mahuaiiracema@gmail.com','$2a$10$RtZ5OLixdG.S/gHpsPV6y.Eo5ydEFHGp7b.WyiDWRWLDuzViHVoHK',0,'258844298186',36,1,3,'2026-09-01 16:24:09','2026-09-03 09:57:32',0,NULL,1,NULL,0),(356,'Usuário KMAD','parceiro@kmad.co.mz','$2a$10$OlyMTj5wDocyH41oqZpSaOF0tHBJvSjohrCPadfXTvVl4sUYp54K.',0,'+258840000000',36,1,4,'2026-09-25 15:23:20','2026-09-29 09:50:21',0,NULL,1,11,1);
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `whatsapp_messages`
--

DROP TABLE IF EXISTS `whatsapp_messages`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `whatsapp_messages` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `companyId` int(11) NOT NULL,
  `phone` varchar(50) NOT NULL,
  `accountNumber` varchar(50) DEFAULT NULL,
  `customerName` varchar(255) DEFAULT NULL,
  `messageType` varchar(100) NOT NULL,
  `messageBody` text NOT NULL,
  `status` varchar(50) DEFAULT 'queued',
  `direction` varchar(50) DEFAULT 'outbound',
  `payloadJson` text DEFAULT NULL,
  `createdAt` datetime DEFAULT NULL,
  `updatedAt` datetime DEFAULT NULL,
  `customerId` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `whatsapp_messages`
--

LOCK TABLES `whatsapp_messages` WRITE;
/*!40000 ALTER TABLE `whatsapp_messages` DISABLE KEYS */;
INSERT INTO `whatsapp_messages` VALUES (1,36,'258842678869',NULL,NULL,'APPROVAL','Bem-vindo ao Mais Mola! A empresa foi APROVADA. Aceda em /login com o e-mail mbr@gmail.com. Contacto: +258 870740202','queued','outbound',NULL,'2026-09-14 11:46:20','2026-09-14 11:46:20',NULL);
/*!40000 ALTER TABLE `whatsapp_messages` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-10-24 14:39:36
