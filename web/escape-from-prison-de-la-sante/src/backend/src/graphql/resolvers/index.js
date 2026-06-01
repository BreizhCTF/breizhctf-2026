import { UserResolver, InmateProfileResolver, userQueries, userMutations } from './user.js';
import { AnnouncementResolver, announcementQueries, announcementMutations } from './announcement.js';
import { PostResolver, CommentResolver, BlocResolver, postQueries, postMutations } from './post.js';
import { VisitRequestResolver, ParloirSessionResolver, visitQueries, visitMutations } from './visit.js';
import { WorkJobResolver, WorkSessionResolver, workQueries, workMutations } from './work.js';
import { StoreItemResolver, InventoryItemResolver, WalletTransactionResolver, storeQueries, storeMutations } from './store.js';
import { CellItemResolver, cellQueries, cellMutations } from './cell.js';
import { PhoneCallResolver, ApprovedContactResolver, phoneQueries, phoneMutations } from './phone.js';
import { BookResolver, BookLoanResolver, bookQueries, bookMutations } from './book.js';
import { IncidentResolver, incidentQueries, incidentMutations } from './incident.js';
import { MedicalRecordResolver, MedicalRequestResolver, MedicalRequestInmateResolver, PrescriptionResolver, InfirmaryStayResolver, medicalQueries, medicalMutations } from './medical.js';
import { SolitaryConfinementResolver, SolitaryJournalEntryResolver, solitaryQueries, solitaryMutations } from './solitary.js';
import { LeaveRequestResolver, leaveQueries, leaveMutations } from './leave.js';
import { DirectMessageResolver, messageQueries, messageMutations } from './message.js';
import { ExternalFeedResolver, feedQueries, feedMutations } from './feed.js';
import { GangResolver, GangMemberResolver, GangMessageResolver, gangQueries, gangMutations } from './gang.js';
import { ContrabandItemResolver, BlackMarketListingResolver, TradeResolver, ContrabandInventoryItemResolver, blackmarketQueries, blackmarketMutations } from './blackmarket.js';
import { ProgramResolver, ProgramEnrollmentResolver, programQueries, programMutations } from './program.js';
import { transferQueries, transferMutations } from './transfer.js';
import { MailResolver, mailQueries, mailMutations } from './mailbox.js';
import { PrisonEventResolver, EventAttendanceResolver, scheduleQueries, scheduleMutations } from './schedule.js';
import { cellsearchMutations } from './cellsearch.js';

export const resolvers = {
  Query: {
    ...userQueries,
    ...announcementQueries,
    ...postQueries,
    ...visitQueries,
    ...workQueries,
    ...storeQueries,
    ...cellQueries,
    ...phoneQueries,
    ...bookQueries,
    ...incidentQueries,
    ...medicalQueries,
    ...solitaryQueries,
    ...leaveQueries,
    ...messageQueries,
    ...feedQueries,
    ...gangQueries,
    ...blackmarketQueries,
    ...programQueries,
    ...transferQueries,
    ...mailQueries,
    ...scheduleQueries,
  },

  Mutation: {
    ...userMutations,
    ...announcementMutations,
    ...postMutations,
    ...visitMutations,
    ...workMutations,
    ...storeMutations,
    ...cellMutations,
    ...phoneMutations,
    ...bookMutations,
    ...incidentMutations,
    ...medicalMutations,
    ...solitaryMutations,
    ...leaveMutations,
    ...messageMutations,
    ...feedMutations,
    ...gangMutations,
    ...blackmarketMutations,
    ...programMutations,
    ...transferMutations,
    ...mailMutations,
    ...scheduleMutations,
    ...cellsearchMutations,
  },

  User: UserResolver,
  InmateProfile: InmateProfileResolver,
  Announcement: AnnouncementResolver,
  Post: PostResolver,
  Comment: CommentResolver,
  Bloc: BlocResolver,
  VisitRequest: VisitRequestResolver,
  ParloirSession: ParloirSessionResolver,
  WorkJob: WorkJobResolver,
  WorkSession: WorkSessionResolver,
  StoreItem: StoreItemResolver,
  InventoryItem: InventoryItemResolver,
  WalletTransaction: WalletTransactionResolver,
  CellItem: CellItemResolver,
  PhoneCall: PhoneCallResolver,
  ApprovedContact: ApprovedContactResolver,
  Book: BookResolver,
  BookLoan: BookLoanResolver,
  Incident: IncidentResolver,
  MedicalRecord: MedicalRecordResolver,
  MedicalRequest: { ...MedicalRequestResolver, ...MedicalRequestInmateResolver },
  Prescription: PrescriptionResolver,
  InfirmaryStay: InfirmaryStayResolver,
  SolitaryConfinement: SolitaryConfinementResolver,
  SolitaryJournalEntry: SolitaryJournalEntryResolver,
  LeaveRequest: LeaveRequestResolver,
  DirectMessage: DirectMessageResolver,
  ExternalFeed: ExternalFeedResolver,
  Gang: GangResolver,
  GangMember: GangMemberResolver,
  GangMessage: GangMessageResolver,
  ContrabandItem: ContrabandItemResolver,
  BlackMarketListing: BlackMarketListingResolver,
  Trade: TradeResolver,
  ContrabandInventoryItem: ContrabandInventoryItemResolver,
  Program: ProgramResolver,
  ProgramEnrollment: ProgramEnrollmentResolver,
  Mail: MailResolver,
  PrisonEvent: PrisonEventResolver,
  EventAttendance: EventAttendanceResolver,
  FlaggedTransfer: {
    createdAt: (p) => p.created_at?.toISOString?.() ?? p.created_at,
    senderName: (p) => p.sender_name,
    recipientName: (p) => p.recipient_name,
  },
};
