import { gql } from '@apollo/client';

export const ME = gql`
  query Me {
    me {
      id username email role
      profile {
        id prisonNumber cell conductScore walletBalance phoneCredits reputationScore
        isInSolitary status
        privileges { yard library work visits phone }
        bloc { id name wing }
        activeSolitary { id reason endsAt durationDays startedAt }
      }
    }
  }
`;

export const MY_PROFILE = gql`
  query MyProfile {
    myProfile {
      id prisonNumber cell offense entryDate releaseDate status
      conductScore walletBalance phoneCredits reputationScore isInSolitary
      privileges { yard library work visits phone }
      bloc { id name wing }
      activeSolitary { id reason endsAt durationDays startedAt releasedEarly }
      medicalRecord { bloodType allergies chronicConditions }
    }
  }
`;

export const MY_BLOC = gql`
  query MyBloc {
    myBloc {
      id name wing isLocked lockdownReason
      posts(limit: 20) {
        id content likes likedByMe createdAt
        author { id username }
        comments { id content createdAt user { id username } }
      }
      announcements {
        id title content priority createdAt
        author { id username }
      }
    }
  }
`;

export const WORK_JOBS = gql`
  query WorkJobs {
    workJobs {
      id name description location payAmount cooldownMinutes active
      myLastSession { id completedAt earnings }
    }
  }
`;

export const MY_WALLET = gql`
  query MyWallet {
    myWallet {
      id amount type description createdAt
    }
  }
`;

export const STORE_ITEMS = gql`
  query StoreItems($category: String) {
    storeItems(category: $category) {
      id name description price category stock available imageSlug
    }
  }
`;

export const MY_INVENTORY = gql`
  query MyInventory {
    myInventory {
      id quantity acquiredAt
      item { id name description category imageSlug }
    }
  }
`;

export const MY_CELL = gql`
  query MyCell {
    myCell {
      id slot placedAt
      item { id name category imageSlug }
    }
  }
`;

export const MY_VISIT_REQUESTS = gql`
  query MyVisitRequests {
    myVisitRequests {
      id visitorName visitorRelation visitorPhone requestedDate timeSlot
      status guardNotes createdAt
      parloirSession {
        id startedAt endedAt durationMinutes guardInterrupted
        smugglingAttempt
        transcript { speaker text timestamp }
      }
    }
  }
`;

export const MY_APPROVED_CONTACTS = gql`
  query MyApprovedContacts {
    myApprovedContacts {
      id contactName contactPhone relation
    }
  }
`;

export const MY_PHONE_CALLS = gql`
  query MyPhoneCalls {
    myPhoneCalls {
      id durationMinutes creditsUsed calledAt
      contact { id contactName contactPhone relation }
    }
  }
`;

export const BOOKS = gql`
  query Books($genre: String) {
    books(genre: $genre) {
      id title author genre description availableCopies
    }
  }
`;

export const MY_LOANS = gql`
  query MyLoans {
    myLoans {
      id loanDate dueDate returnDate status
      book { id title author genre }
    }
  }
`;

export const MY_MEDICAL_REQUESTS = gql`
  query MyMedicalRequests {
    myMedicalRequests {
      id symptoms urgency status appointmentDate appointmentTime
      nurseNotes diagnosis createdAt
      prescriptions { id medicationName dosage frequency startDate endDate dispensed }
    }
  }
`;

export const MY_ACTIVE_PRESCRIPTIONS = gql`
  query MyActivePrescriptions {
    myActivePrescriptions {
      id medicationName dosage frequency startDate endDate dispensed
    }
  }
`;

export const MY_INFIRMARY_STAYS = gql`
  query MyInfirmaryStays {
    myInfirmaryStays {
      id reason admittedAt dischargedAt notes
    }
  }
`;

export const MY_LEAVE_REQUESTS = gql`
  query MyLeaveRequests {
    myLeaveRequests {
      id reason requestedStart requestedEnd status directorNotes createdAt
    }
  }
`;

export const MY_INCIDENTS = gql`
  query MyIncidents {
    myIncidents {
      id type description status conductPenalty createdAt
      reporter { id username }
    }
  }
`;

export const MY_SOLITARY_JOURNAL = gql`
  query MySolitaryJournal {
    mySolitaryJournal {
      id content writtenAt
    }
  }
`;

export const MY_MESSAGES = gql`
  query MyMessages($contactId: ID) {
    myMessages(contactId: $contactId) {
      id content readAt sentAt
      sender { id username }
      recipient { id username }
    }
  }
`;

export const INMATES_IN_BLOC = gql`
  query InmatesInBloc {
    inmatesInBloc {
      id username
    }
  }
`;

export const ANNOUNCEMENTS = gql`
  query Announcements($blocId: ID) {
    announcements(blocId: $blocId) {
      id title content priority createdAt
      author { id username email token }
      bloc { id name }
    }
  }
`;

export const POSTS = gql`
  query Posts($blocId: ID, $limit: Int) {
    posts(blocId: $blocId, limit: $limit) {
      id content likes likedByMe createdAt
      author { id username }
      bloc { id name }
      comments {
        id content createdAt
        user { id username }
      }
    }
  }
`;

export const VISIT_REQUESTS = gql`
  query VisitRequests($status: String) {
    visitRequests(status: $status) {
      id visitorName visitorRelation visitorPhone requestedDate timeSlot
      status guardNotes createdAt
      inmate { id username }
      parloirSession { id startedAt guardInterrupted }
    }
  }
`;

export const GUARD_INCIDENTS = gql`
  query Incidents($status: String) {
    incidents(status: $status) {
      id type description status conductPenalty createdAt
      reporter { id username }
      involvedInmate { id username }
    }
  }
`;

export const GUARD_MEDICAL_REQUESTS = gql`
  query MedicalRequests($status: String) {
    medicalRequests(status: $status) {
      id symptoms urgency status appointmentDate appointmentTime createdAt
      inmate { id username }
    }
  }
`;

export const SOLITARY_CONFINEMENTS = gql`
  query SolitaryConfinements($active: Boolean) {
    solitaryConfinements(active: $active) {
      id reason startedAt endsAt durationDays releasedEarly
      inmate { id username }
      orderedBy { id username }
    }
  }
`;

export const GUARD_LEAVE_REQUESTS = gql`
  query LeaveRequests($status: String) {
    leaveRequests(status: $status) {
      id reason requestedStart requestedEnd status directorNotes createdAt
      inmate { id username }
    }
  }
`;

export const USERS = gql`
  query Users($status: String) {
    users(status: $status) {
      id username email role
      profile {
        id prisonNumber cell conductScore walletBalance reputationScore isInSolitary status
        bloc { id name }
        privileges { yard library work visits phone }
      }
    }
  }
`;

export const EXTERNAL_FEEDS = gql`
  query ExternalFeeds {
    externalFeeds {
      id name url type lastFetched lastStatus active
    }
  }
`;

export const ALL_BLOCS = gql`
  query AllBlocs {
    allBlocs {
      id name wing capacity currentOccupancy
    }
  }
`;

export const GANGS = gql`
  query Gangs {
    gangs {
      id name description memberCount
      leader { id username }
    }
  }
`;

export const MY_GANG = gql`
  query MyGang {
    myGang {
      id name description memberCount
      leader { id username }
      members { id role joinedAt user { id username } }
    }
  }
`;

export const GANG_MESSAGES = gql`
  query GangMessages($gangId: ID!) {
    gangMessages(gangId: $gangId) {
      id content sentAt
      sender { id username }
    }
  }
`;

export const CONTRABAND_ITEMS = gql`
  query ContrabandItems {
    contrabandItems {
      id name description basePrice riskLevel category
    }
  }
`;

export const BLACK_MARKET_LISTINGS = gql`
  query BlackMarketListings {
    blackMarketListings {
      id price quantity active createdAt
      seller { id username }
      contrabandItem { id name description basePrice riskLevel category }
    }
  }
`;

export const MY_CONTRABAND_INVENTORY = gql`
  query MyContrabandInventory {
    myContrabandInventory {
      id quantity acquiredAt
      contrabandItem { id name description riskLevel category }
    }
  }
`;

export const MY_TRADES = gql`
  query MyTrades {
    myTrades {
      id price detected completedAt
      buyer { id username }
      seller { id username }
      listing { id contrabandItem { id name } }
    }
  }
`;

export const PROGRAMS = gql`
  query Programs {
    programs {
      id name description totalSessions conductBonus requiredForLeave category
    }
  }
`;

export const MY_ENROLLMENTS = gql`
  query MyEnrollments {
    myEnrollments {
      id sessionsCompleted status enrolledAt completedAt
      program { id name totalSessions conductBonus category }
    }
  }
`;

export const MY_TRANSFERS = gql`
  query MyTransfers {
    myTransfers {
      id amount type description createdAt
    }
  }
`;

export const FLAGGED_TRANSFERS = gql`
  query FlaggedTransfers {
    flaggedTransfers {
      id amount type description flagged createdAt senderName recipientName
    }
  }
`;

export const MY_MAIL = gql`
  query MyMail($direction: String) {
    myMail(direction: $direction) {
      id direction correspondentName subject content status createdAt
    }
  }
`;

export const ALL_MAIL = gql`
  query AllMail($status: String) {
    allMail(status: $status) {
      id direction correspondentName subject content status createdAt
      inmate { id username }
      interceptedBy { id username }
    }
  }
`;

export const PRISON_EVENTS = gql`
  query PrisonEvents($eventType: String) {
    prisonEvents(eventType: $eventType) {
      id name description eventTime eventType recurring dayOfWeek
      bloc { id name }
    }
  }
`;

export const EVENT_ATTENDANCE = gql`
  query EventAttendance($eventId: ID!, $date: String) {
    eventAttendance(eventId: $eventId, date: $date) {
      id date present markedAt
      inmate { id username }
      markedBy { id username }
    }
  }
`;
