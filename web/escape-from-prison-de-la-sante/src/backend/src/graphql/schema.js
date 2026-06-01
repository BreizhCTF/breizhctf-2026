export const typeDefs = `#graphql
  type User {
    id: ID!
    username: String!
    email: String!
    role: String!
    token: String
    profile: InmateProfile
    posts: [Post!]!
    comments: [Comment!]!
    visitRequests: [VisitRequest!]!
  }

  type InmateProfile {
    id: ID!
    prisonNumber: String!
    cell: String!
    bloc: Bloc!
    entryDate: String!
    releaseDate: String
    offense: String!
    status: String!
    conductScore: Int!
    walletBalance: Float!
    phoneCredits: Int!
    isInSolitary: Boolean!
    reputationScore: Int!
    privileges: Privileges!
    medicalRecord: MedicalRecord
    activeSolitary: SolitaryConfinement
  }

  type Privileges {
    yard: Boolean!
    library: Boolean!
    work: Boolean!
    visits: Boolean!
    phone: Boolean!
  }

  type Bloc {
    id: ID!
    name: String!
    wing: String!
    capacity: Int!
    currentOccupancy: Int!
    isLocked: Boolean!
    lockdownReason: String
    inmates: [User!]!
    posts(limit: Int): [Post!]!
    announcements: [Announcement!]!
  }

  type Post {
    id: ID!
    content: String!
    likes: Int!
    likedByMe: Boolean!
    author: User!
    bloc: Bloc!
    createdAt: String!
    comments: [Comment!]!
  }

  type Comment {
    id: ID!
    content: String!
    user: User!
    post: Post!
    createdAt: String!
  }

  type Announcement {
    id: ID!
    title: String!
    content: String!
    author: User!
    bloc: Bloc
    priority: String!
    createdAt: String!
  }

  type WorkJob {
    id: ID!
    name: String!
    description: String!
    location: String!
    payAmount: Float!
    cooldownMinutes: Int!
    slotsAvailable: Int!
    active: Boolean!
    myLastSession: WorkSession
  }

  type WorkSession {
    id: ID!
    job: WorkJob!
    completedAt: String
    earnings: Float!
    status: String!
  }

  type WalletTransaction {
    id: ID!
    amount: Float!
    type: String!
    description: String!
    createdAt: String!
  }

  type StoreItem {
    id: ID!
    name: String!
    description: String!
    price: Float!
    category: String!
    stock: Int!
    available: Boolean!
    imageSlug: String
  }

  type InventoryItem {
    id: ID!
    item: StoreItem!
    quantity: Int!
    acquiredAt: String!
  }

  type CellItem {
    id: ID!
    item: StoreItem!
    slot: String!
    placedAt: String!
  }

  type ApprovedContact {
    id: ID!
    contactName: String!
    contactPhone: String!
    relation: String!
  }

  type PhoneCall {
    id: ID!
    contact: ApprovedContact!
    durationMinutes: Int!
    creditsUsed: Int!
    calledAt: String!
  }

  type VisitRequest {
    id: ID!
    inmate: User!
    visitorName: String!
    visitorRelation: String!
    visitorPhone: String!
    requestedDate: String!
    timeSlot: String!
    status: String!
    guardNotes: String
    createdAt: String!
    parloirSession: ParloirSession
  }

  type ParloirSession {
    id: ID!
    visitRequestId: ID!
    startedAt: String
    endedAt: String
    durationMinutes: Int
    guardInterrupted: Boolean!
    smugglingAttempt: Boolean!
    transcript: [TranscriptLine!]!
  }

  type TranscriptLine {
    speaker: String!
    text: String!
    timestamp: String!
  }

  type SmugglingResult {
    success: Boolean!
    amount: Float
    conductPenalty: Int
    message: String!
  }

  type Book {
    id: ID!
    title: String!
    author: String!
    genre: String!
    isbn: String
    description: String!
    availableCopies: Int!
  }

  type BookLoan {
    id: ID!
    book: Book!
    loanDate: String!
    dueDate: String!
    returnDate: String
    status: String!
  }

  type MedicalRecord {
    id: ID!
    bloodType: String
    allergies: String
    chronicConditions: String
    lastUpdated: String
  }

  type MedicalRequest {
    id: ID!
    inmate: User
    symptoms: String!
    urgency: String!
    appointmentDate: String
    appointmentTime: String
    status: String!
    nurseNotes: String
    diagnosis: String
    prescriptions: [Prescription!]!
    createdAt: String!
  }

  type Prescription {
    id: ID!
    medicationName: String!
    dosage: String!
    frequency: String!
    startDate: String!
    endDate: String
    dispensed: Boolean!
  }

  type InfirmaryStay {
    id: ID!
    reason: String!
    admittedAt: String!
    dischargedAt: String
    notes: String
  }

  type SolitaryConfinement {
    id: ID!
    inmate: User
    reason: String!
    orderedBy: User!
    startedAt: String!
    endsAt: String!
    durationDays: Int!
    releasedEarly: Boolean!
    releasedAt: String
    releasedBy: User
  }

  type SolitaryJournalEntry {
    id: ID!
    content: String!
    writtenAt: String!
  }

  type LeaveRequest {
    id: ID!
    inmate: User
    reason: String!
    requestedStart: String!
    requestedEnd: String!
    status: String!
    directorNotes: String
    createdAt: String!
  }

  type Incident {
    id: ID!
    reporter: User!
    involvedInmate: User
    type: String!
    description: String!
    status: String!
    conductPenalty: Int!
    createdAt: String!
  }

  type DirectMessage {
    id: ID!
    sender: User!
    recipient: User!
    content: String!
    readAt: String
    sentAt: String!
  }

  type ExternalFeed {
    id: ID!
    name: String!
    url: String!
    type: String!
    lastFetched: String
    lastStatus: Int
    active: Boolean!
    createdAt: String!
  }

  type FeedFetchResult {
    success: Boolean!
    statusCode: Int
    preview: String
    error: String
  }

  type PurchaseOrder {
    id: ID!
    total: Float!
    status: String!
    createdAt: String!
  }

  type Gang {
    id: ID!
    name: String!
    description: String
    leader: User
    members: [GangMember!]!
    messages: [GangMessage!]!
    memberCount: Int!
    createdAt: String!
  }

  type GangMember {
    id: ID!
    user: User!
    gang: Gang!
    role: String!
    joinedAt: String!
  }

  type GangMessage {
    id: ID!
    sender: User!
    content: String!
    sentAt: String!
  }

  type ContrabandItem {
    id: ID!
    name: String!
    description: String
    basePrice: Float!
    riskLevel: Int!
    category: String!
  }

  type BlackMarketListing {
    id: ID!
    seller: User!
    contrabandItem: ContrabandItem!
    price: Float!
    quantity: Int!
    active: Boolean!
    createdAt: String!
  }

  type Trade {
    id: ID!
    listing: BlackMarketListing!
    buyer: User!
    seller: User!
    price: Float!
    detected: Boolean!
    completedAt: String!
  }

  type BlackMarketResult {
    trade: Trade!
    detected: Boolean!
    message: String!
  }

  type Program {
    id: ID!
    name: String!
    description: String
    totalSessions: Int!
    conductBonus: Int!
    requiredForLeave: Boolean!
    category: String!
  }

  type ProgramEnrollment {
    id: ID!
    program: Program!
    inmate: User!
    sessionsCompleted: Int!
    status: String!
    enrolledAt: String!
    completedAt: String
  }

  type Mail {
    id: ID!
    inmate: User!
    direction: String!
    correspondentName: String!
    subject: String
    content: String!
    status: String!
    interceptedBy: User
    createdAt: String!
  }

  type PrisonEvent {
    id: ID!
    name: String!
    description: String
    eventTime: String!
    eventType: String!
    recurring: Boolean!
    dayOfWeek: Int
    bloc: Bloc
    createdAt: String!
  }

  type EventAttendance {
    id: ID!
    event: PrisonEvent!
    inmate: User!
    date: String!
    present: Boolean!
    markedBy: User
    markedAt: String!
  }

  type FlaggedTransfer {
    id: ID!
    amount: Float!
    type: String!
    description: String
    flagged: Boolean!
    createdAt: String!
    senderName: String
    recipientName: String
  }

  type ContrabandInventoryItem {
    id: ID!
    contrabandItem: ContrabandItem!
    quantity: Int!
    acquiredAt: String!
  }

  type CellSearchResult {
    seized: Int!
    message: String!
  }

  input OrderItemInput {
    itemId: ID!
    quantity: Int!
  }

  input PurchaseItemInput {
    itemId: ID!
    quantity: Int!
  }

  input PrivilegesInput {
    yard: Boolean
    library: Boolean
    work: Boolean
    visits: Boolean
    phone: Boolean
  }

  type Query {
    announcements(blocId: ID): [Announcement!]!
    posts(blocId: ID, limit: Int): [Post!]!
    storeItems(category: String): [StoreItem!]!
    books(genre: String): [Book!]!

    me: User!
    myProfile: InmateProfile!
    myBloc: Bloc!
    myWallet: [WalletTransaction!]!
    myInventory: [InventoryItem!]!
    myCell: [CellItem!]!
    myVisitRequests: [VisitRequest!]!
    parloirSession(visitId: ID!): ParloirSession
    myApprovedContacts: [ApprovedContact!]!
    myPhoneCalls: [PhoneCall!]!
    myLoans: [BookLoan!]!
    myMedicalRequests: [MedicalRequest!]!
    myActivePrescriptions: [Prescription!]!
    myInfirmaryStays: [InfirmaryStay!]!
    myLeaveRequests: [LeaveRequest!]!
    myIncidents: [Incident!]!
    mySolitaryJournal: [SolitaryJournalEntry!]!
    myMessages(contactId: ID): [DirectMessage!]!
    workJobs: [WorkJob!]!
    inmatesInBloc: [User!]!

    users(blocId: ID, status: String): [User!]!
    user(id: ID!): User!
    visitRequests(status: String): [VisitRequest!]!
    incidents(status: String): [Incident!]!
    medicalRequests(status: String): [MedicalRequest!]!
    leaveRequests(status: String): [LeaveRequest!]!
    solitaryConfinements(active: Boolean): [SolitaryConfinement!]!
    externalFeeds: [ExternalFeed!]!
    allBlocs: [Bloc!]!

    gangs: [Gang!]!
    myGang: Gang
    gangMessages(gangId: ID!): [GangMessage!]!

    contrabandItems: [ContrabandItem!]!
    blackMarketListings: [BlackMarketListing!]!
    myContrabandInventory: [ContrabandInventoryItem!]!
    myTrades: [Trade!]!

    programs: [Program!]!
    myEnrollments: [ProgramEnrollment!]!

    myTransfers: [WalletTransaction!]!
    flaggedTransfers: [FlaggedTransfer!]!

    myMail(direction: String): [Mail!]!
    allMail(status: String): [Mail!]!

    prisonEvents(eventType: String): [PrisonEvent!]!
    eventAttendance(eventId: ID!, date: String): [EventAttendance!]!
  }

  type Mutation {
    createPost(content: String!, blocId: ID!): Post!
    likePost(postId: ID!): Post!
    createComment(content: String!, postId: ID!): Comment!
    sendMessage(recipientId: ID!, content: String!): DirectMessage!
    markMessageRead(messageId: ID!): DirectMessage!

    startWork(jobId: ID!): WorkSession!
    purchaseItems(items: [PurchaseItemInput!]!): PurchaseOrder!
    placeCellItem(inventoryItemId: ID!, slot: String!): CellItem!
    removeCellItem(cellItemId: ID!): Boolean!

    requestVisit(
      visitorName: String!
      visitorRelation: String!
      visitorPhone: String!
      requestedDate: String!
      timeSlot: String!
    ): VisitRequest!
    attemptSmugglingDuringVisit(visitId: ID!, amount: Float!): SmugglingResult!

    makePhoneCall(contactId: ID!, durationMinutes: Int!): PhoneCall!

    borrowBook(bookId: ID!): BookLoan!
    returnBook(loanId: ID!): BookLoan!

    createMedicalRequest(symptoms: String!, urgency: String): MedicalRequest!
    createEmergencyAlert: MedicalRequest!
    createLeaveRequest(reason: String!, requestedStart: String!, requestedEnd: String!): LeaveRequest!
    createIncident(type: String!, description: String!): Incident!
    writeSolitaryJournalEntry(content: String!): SolitaryJournalEntry!

    updateVisitRequest(id: ID!, status: String!, notes: String): VisitRequest!
    startParloir(visitRequestId: ID!): ParloirSession!
    interruptParloir(parloirId: ID!): ParloirSession!

    resolveIncident(id: ID!, status: String!, conductPenalty: Int): Incident!
    adjustConductScore(inmateId: ID!, delta: Int!, reason: String!): InmateProfile!
    updatePrivileges(inmateId: ID!, privileges: PrivilegesInput!): InmateProfile!

    scheduleMedicalAppointment(requestId: ID!, date: String!, time: String!): MedicalRequest!
    completeMedicalConsultation(requestId: ID!, nurseNotes: String!, diagnosis: String): MedicalRequest!
    addPrescription(
      requestId: ID!
      medicationName: String!
      dosage: String!
      frequency: String!
      startDate: String!
      endDate: String
    ): Prescription!
    admitToInfirmary(inmateId: ID!, reason: String!): InfirmaryStay!
    dischargeFromInfirmary(stayId: ID!, notes: String): InfirmaryStay!

    placeSolitary(inmateId: ID!, reason: String!, durationDays: Int!): SolitaryConfinement!
    releaseSolitary(confinementId: ID!): SolitaryConfinement!

    createAnnouncement(title: String!, content: String!, blocId: ID, priority: String): Announcement!
    approveContact(
      inmateId: ID!
      contactName: String!
      contactPhone: String!
      relation: String!
    ): ApprovedContact!
    updateInmateBloc(inmateId: ID!, blocId: ID!): InmateProfile!

    addExternalFeed(name: String!, url: String!, type: String): ExternalFeed!
    fetchExternalFeed(feedId: ID!, activationCode: String!): FeedFetchResult!
    removeExternalFeed(feedId: ID!): Boolean!

    joinGang(gangId: ID!): Gang!
    leaveGang: Boolean!
    sendGangMessage(gangId: ID!, content: String!): GangMessage!

    createListing(contrabandItemId: ID!, price: Float!, quantity: Int): BlackMarketListing!
    buyFromBlackMarket(listingId: ID!): BlackMarketResult!
    cancelListing(listingId: ID!): Boolean!

    enrollInProgram(programId: ID!): ProgramEnrollment!
    completeSession(enrollmentId: ID!): ProgramEnrollment!
    dropProgram(enrollmentId: ID!): Boolean!

    transferFunds(recipientId: ID!, amount: Float!): WalletTransaction!
    flagTransfer(transactionId: ID!): WalletTransaction!

    sendMail(correspondentName: String!, subject: String, content: String!): Mail!
    interceptMail(mailId: ID!): Mail!
    deliverMail(mailId: ID!): Mail!

    createPrisonEvent(name: String!, description: String, eventTime: String!, eventType: String!, recurring: Boolean, dayOfWeek: Int, blocId: ID): PrisonEvent!
    markAttendance(eventId: ID!, inmateId: ID!, present: Boolean!, date: String): EventAttendance!

    updateLeaveRequest(id: ID!, status: String!, notes: String): LeaveRequest!
    performCellSearch(inmateId: ID!): CellSearchResult!
  }
`;
