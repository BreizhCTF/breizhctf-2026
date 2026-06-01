import { gql } from '@apollo/client';

export const START_WORK = gql`
  mutation StartWork($jobId: ID!) {
    startWork(jobId: $jobId) {
      id completedAt earnings
      job { id name payAmount }
    }
  }
`;

export const PURCHASE_ITEMS = gql`
  mutation PurchaseItems($items: [PurchaseItemInput!]!) {
    purchaseItems(items: $items) {
      id total status createdAt
    }
  }
`;

export const PLACE_CELL_ITEM = gql`
  mutation PlaceCellItem($inventoryItemId: ID!, $slot: String!) {
    placeCellItem(inventoryItemId: $inventoryItemId, slot: $slot) {
      id slot placedAt
      item { id name category }
    }
  }
`;

export const REMOVE_CELL_ITEM = gql`
  mutation RemoveCellItem($cellItemId: ID!) {
    removeCellItem(cellItemId: $cellItemId)
  }
`;

export const REQUEST_VISIT = gql`
  mutation RequestVisit(
    $visitorName: String!, $visitorRelation: String!,
    $visitorPhone: String!, $requestedDate: String!, $timeSlot: String!
  ) {
    requestVisit(
      visitorName: $visitorName, visitorRelation: $visitorRelation,
      visitorPhone: $visitorPhone, requestedDate: $requestedDate, timeSlot: $timeSlot
    ) {
      id status requestedDate timeSlot
    }
  }
`;

export const ATTEMPT_SMUGGLING = gql`
  mutation AttemptSmuggling($visitId: ID!, $amount: Float!) {
    attemptSmugglingDuringVisit(visitId: $visitId, amount: $amount) {
      success amount conductPenalty message
    }
  }
`;

export const MAKE_PHONE_CALL = gql`
  mutation MakePhoneCall($contactId: ID!, $durationMinutes: Int!) {
    makePhoneCall(contactId: $contactId, durationMinutes: $durationMinutes) {
      id durationMinutes creditsUsed calledAt
      contact { id contactName }
    }
  }
`;

export const BORROW_BOOK = gql`
  mutation BorrowBook($bookId: ID!) {
    borrowBook(bookId: $bookId) {
      id loanDate dueDate status
      book { id title author }
    }
  }
`;

export const RETURN_BOOK = gql`
  mutation ReturnBook($loanId: ID!) {
    returnBook(loanId: $loanId) {
      id status returnDate
      book { id title }
    }
  }
`;

export const CREATE_MEDICAL_REQUEST = gql`
  mutation CreateMedicalRequest($symptoms: String!, $urgency: String) {
    createMedicalRequest(symptoms: $symptoms, urgency: $urgency) {
      id symptoms urgency status createdAt
    }
  }
`;

export const CREATE_EMERGENCY_ALERT = gql`
  mutation CreateEmergencyAlert {
    createEmergencyAlert {
      id urgency status createdAt
    }
  }
`;

export const CREATE_LEAVE_REQUEST = gql`
  mutation CreateLeaveRequest($reason: String!, $requestedStart: String!, $requestedEnd: String!) {
    createLeaveRequest(reason: $reason, requestedStart: $requestedStart, requestedEnd: $requestedEnd) {
      id reason requestedStart requestedEnd status createdAt
    }
  }
`;

export const CREATE_INCIDENT = gql`
  mutation CreateIncident($type: String!, $description: String!) {
    createIncident(type: $type, description: $description) {
      id type description status createdAt
    }
  }
`;

export const WRITE_SOLITARY_JOURNAL = gql`
  mutation WriteSolitaryJournalEntry($content: String!) {
    writeSolitaryJournalEntry(content: $content) {
      id content writtenAt
    }
  }
`;

export const SEND_MESSAGE = gql`
  mutation SendMessage($recipientId: ID!, $content: String!) {
    sendMessage(recipientId: $recipientId, content: $content) {
      id content sentAt
      sender { id username }
      recipient { id username }
    }
  }
`;

export const MARK_MESSAGE_READ = gql`
  mutation MarkMessageRead($messageId: ID!) {
    markMessageRead(messageId: $messageId) {
      id readAt
    }
  }
`;

export const CREATE_POST = gql`
  mutation CreatePost($content: String!, $blocId: ID!) {
    createPost(content: $content, blocId: $blocId) {
      id content likes createdAt
      author { id username }
    }
  }
`;

export const LIKE_POST = gql`
  mutation LikePost($postId: ID!) {
    likePost(postId: $postId) {
      id likes
    }
  }
`;

export const CREATE_COMMENT = gql`
  mutation CreateComment($content: String!, $postId: ID!) {
    createComment(content: $content, postId: $postId) {
      id content createdAt
      user { id username }
    }
  }
`;

export const UPDATE_VISIT_REQUEST = gql`
  mutation UpdateVisitRequest($id: ID!, $status: String!, $notes: String) {
    updateVisitRequest(id: $id, status: $status, notes: $notes) {
      id status guardNotes
    }
  }
`;

export const START_PARLOIR = gql`
  mutation StartParloir($visitRequestId: ID!) {
    startParloir(visitRequestId: $visitRequestId) {
      id startedAt transcript { speaker text timestamp }
    }
  }
`;

export const INTERRUPT_PARLOIR = gql`
  mutation InterruptParloir($parloirId: ID!) {
    interruptParloir(parloirId: $parloirId) {
      id guardInterrupted endedAt
    }
  }
`;

export const RESOLVE_INCIDENT = gql`
  mutation ResolveIncident($id: ID!, $status: String!, $conductPenalty: Int) {
    resolveIncident(id: $id, status: $status, conductPenalty: $conductPenalty) {
      id status conductPenalty
    }
  }
`;

export const ADJUST_CONDUCT_SCORE = gql`
  mutation AdjustConductScore($inmateId: ID!, $delta: Int!, $reason: String!) {
    adjustConductScore(inmateId: $inmateId, delta: $delta, reason: $reason) {
      id conductScore
    }
  }
`;

export const UPDATE_PRIVILEGES = gql`
  mutation UpdatePrivileges($inmateId: ID!, $privileges: PrivilegesInput!) {
    updatePrivileges(inmateId: $inmateId, privileges: $privileges) {
      id privileges { yard library work visits phone }
    }
  }
`;

export const PLACE_SOLITARY = gql`
  mutation PlaceSolitary($inmateId: ID!, $reason: String!, $durationDays: Int!) {
    placeSolitary(inmateId: $inmateId, reason: $reason, durationDays: $durationDays) {
      id reason startedAt endsAt
    }
  }
`;

export const RELEASE_SOLITARY = gql`
  mutation ReleaseSolitary($confinementId: ID!) {
    releaseSolitary(confinementId: $confinementId) {
      id releasedEarly releasedAt
    }
  }
`;

export const APPROVE_CONTACT = gql`
  mutation ApproveContact($inmateId: ID!, $contactName: String!, $contactPhone: String!, $relation: String!) {
    approveContact(inmateId: $inmateId, contactName: $contactName, contactPhone: $contactPhone, relation: $relation) {
      id contactName contactPhone relation
    }
  }
`;

export const CREATE_ANNOUNCEMENT = gql`
  mutation CreateAnnouncement($title: String!, $content: String!, $blocId: ID, $priority: String) {
    createAnnouncement(title: $title, content: $content, blocId: $blocId, priority: $priority) {
      id title priority createdAt
    }
  }
`;

export const ADD_EXTERNAL_FEED = gql`
  mutation AddExternalFeed($name: String!, $url: String!, $type: String) {
    addExternalFeed(name: $name, url: $url, type: $type) {
      id name url type active
    }
  }
`;

export const FETCH_EXTERNAL_FEED = gql`
  mutation FetchExternalFeed($feedId: ID!, $activationCode: String!) {
    fetchExternalFeed(feedId: $feedId, activationCode: $activationCode) {
      success statusCode preview error
    }
  }
`;

export const REMOVE_EXTERNAL_FEED = gql`
  mutation RemoveExternalFeed($feedId: ID!) {
    removeExternalFeed(feedId: $feedId)
  }
`;

export const SCHEDULE_MEDICAL_APPOINTMENT = gql`
  mutation ScheduleMedicalAppointment($requestId: ID!, $date: String!, $time: String!) {
    scheduleMedicalAppointment(requestId: $requestId, date: $date, time: $time) {
      id status appointmentDate appointmentTime
    }
  }
`;

export const COMPLETE_MEDICAL_CONSULTATION = gql`
  mutation CompleteMedicalConsultation($requestId: ID!, $nurseNotes: String!, $diagnosis: String) {
    completeMedicalConsultation(requestId: $requestId, nurseNotes: $nurseNotes, diagnosis: $diagnosis) {
      id status nurseNotes diagnosis
    }
  }
`;

export const ADD_PRESCRIPTION = gql`
  mutation AddPrescription(
    $requestId: ID!, $medicationName: String!, $dosage: String!,
    $frequency: String!, $startDate: String!, $endDate: String
  ) {
    addPrescription(
      requestId: $requestId, medicationName: $medicationName, dosage: $dosage,
      frequency: $frequency, startDate: $startDate, endDate: $endDate
    ) {
      id medicationName dosage frequency startDate endDate
    }
  }
`;

export const ADMIT_TO_INFIRMARY = gql`
  mutation AdmitToInfirmary($inmateId: ID!, $reason: String!) {
    admitToInfirmary(inmateId: $inmateId, reason: $reason) {
      id reason admittedAt
    }
  }
`;

export const DISCHARGE_FROM_INFIRMARY = gql`
  mutation DischargeFromInfirmary($stayId: ID!, $notes: String) {
    dischargeFromInfirmary(stayId: $stayId, notes: $notes) {
      id dischargedAt notes
    }
  }
`;

export const UPDATE_INMATE_BLOC = gql`
  mutation UpdateInmateBloc($inmateId: ID!, $blocId: ID!) {
    updateInmateBloc(inmateId: $inmateId, blocId: $blocId) {
      id cell
      bloc { id name wing }
    }
  }
`;

export const JOIN_GANG = gql`
  mutation JoinGang($gangId: ID!) {
    joinGang(gangId: $gangId) {
      id name memberCount
    }
  }
`;

export const LEAVE_GANG = gql`
  mutation LeaveGang {
    leaveGang
  }
`;

export const SEND_GANG_MESSAGE = gql`
  mutation SendGangMessage($gangId: ID!, $content: String!) {
    sendGangMessage(gangId: $gangId, content: $content) {
      id content sentAt
      sender { id username }
    }
  }
`;

export const CREATE_LISTING = gql`
  mutation CreateListing($contrabandItemId: ID!, $price: Float!, $quantity: Int) {
    createListing(contrabandItemId: $contrabandItemId, price: $price, quantity: $quantity) {
      id price quantity active
    }
  }
`;

export const BUY_FROM_BLACK_MARKET = gql`
  mutation BuyFromBlackMarket($listingId: ID!) {
    buyFromBlackMarket(listingId: $listingId) {
      detected message
      trade { id price detected }
    }
  }
`;

export const CANCEL_LISTING = gql`
  mutation CancelListing($listingId: ID!) {
    cancelListing(listingId: $listingId)
  }
`;

export const ENROLL_IN_PROGRAM = gql`
  mutation EnrollInProgram($programId: ID!) {
    enrollInProgram(programId: $programId) {
      id status sessionsCompleted
      program { id name }
    }
  }
`;

export const COMPLETE_SESSION = gql`
  mutation CompleteSession($enrollmentId: ID!) {
    completeSession(enrollmentId: $enrollmentId) {
      id sessionsCompleted status completedAt
    }
  }
`;

export const DROP_PROGRAM = gql`
  mutation DropProgram($enrollmentId: ID!) {
    dropProgram(enrollmentId: $enrollmentId)
  }
`;

export const TRANSFER_FUNDS = gql`
  mutation TransferFunds($recipientId: ID!, $amount: Float!) {
    transferFunds(recipientId: $recipientId, amount: $amount) {
      id amount type description createdAt
    }
  }
`;

export const FLAG_TRANSFER = gql`
  mutation FlagTransfer($transactionId: ID!) {
    flagTransfer(transactionId: $transactionId) {
      id amount flagged
    }
  }
`;

export const SEND_MAIL = gql`
  mutation SendMail($correspondentName: String!, $subject: String, $content: String!) {
    sendMail(correspondentName: $correspondentName, subject: $subject, content: $content) {
      id direction correspondentName subject status createdAt
    }
  }
`;

export const INTERCEPT_MAIL = gql`
  mutation InterceptMail($mailId: ID!) {
    interceptMail(mailId: $mailId) {
      id status
      interceptedBy { id username }
    }
  }
`;

export const DELIVER_MAIL = gql`
  mutation DeliverMail($mailId: ID!) {
    deliverMail(mailId: $mailId) {
      id status
    }
  }
`;

export const CREATE_PRISON_EVENT = gql`
  mutation CreatePrisonEvent($name: String!, $description: String, $eventTime: String!, $eventType: String!, $recurring: Boolean, $dayOfWeek: Int, $blocId: ID) {
    createPrisonEvent(name: $name, description: $description, eventTime: $eventTime, eventType: $eventType, recurring: $recurring, dayOfWeek: $dayOfWeek, blocId: $blocId) {
      id name eventTime eventType
    }
  }
`;

export const MARK_ATTENDANCE = gql`
  mutation MarkAttendance($eventId: ID!, $inmateId: ID!, $present: Boolean!, $date: String) {
    markAttendance(eventId: $eventId, inmateId: $inmateId, present: $present, date: $date) {
      id present markedAt
    }
  }
`;

export const PERFORM_CELL_SEARCH = gql`
  mutation PerformCellSearch($inmateId: ID!) {
    performCellSearch(inmateId: $inmateId) {
      seized message
    }
  }
`;
