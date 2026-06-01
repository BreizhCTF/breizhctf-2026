package bzh.thunely.website.service;

import bzh.thunely.website.model.Transaction;
import bzh.thunely.website.model.User;
import bzh.thunely.website.repository.TransactionRepository;
import bzh.thunely.website.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;

@Service
public class BankService {

    private final UserRepository userRepository;
    private final TransactionRepository transactionRepository;

    public BankService(UserRepository userRepository, TransactionRepository transactionRepository) {
        this.userRepository = userRepository;
        this.transactionRepository = transactionRepository;
    }

    @Transactional
    public String performTransfer(User sender, String recipientUsername, BigDecimal amount, String message) {
        if (amount.compareTo(BigDecimal.ZERO) <= 0) {
            return "Amount must be positive.";
        }

        if (sender.getBalance().compareTo(amount) < 0) {
            return "Insufficient funds.";
        }

        Optional<User> recipientOpt = userRepository.findByUsername(recipientUsername);
        if (recipientOpt.isEmpty()) {
            return "Recipient not found.";
        }

        User recipient = recipientOpt.get();
        if (recipient.getId().equals(sender.getId())) {
            return "Cannot send money to yourself.";
        }

        if (message.length() > 48) {
            return "Message too large.";
        }

        if (containsRestrictedContent(message)) {
            return "External emails and links are not allowed in the message.";
        }

        sender.setBalance(sender.getBalance().subtract(amount));
        recipient.setBalance(recipient.getBalance().add(amount));

        userRepository.save(sender);
        userRepository.save(recipient);

        Transaction tx = new Transaction(sender.getId(), recipient.getId(), amount, message, LocalDateTime.now());
        transactionRepository.save(tx);

        return null; // Success
    }

    public List<Transaction> getUserTransactions(Long userId) {
        List<Transaction> transactions = transactionRepository.findBySenderIdOrReceiverId(userId, userId);
        transactions.sort(Comparator.comparing(Transaction::getCreatedAt).reversed());
        return transactions;
    }

    public String getOtherUsername(Long userId, Transaction t) {
        if (t.getSenderId().equals(userId)) {
            return userRepository.findById(t.getReceiverId()).map(User::getUsername).orElse("Unknown");
        } else {
            return userRepository.findById(t.getSenderId()).map(User::getUsername).orElse("Unknown");
        }
    }

    public boolean containsRestrictedContent(String message) {
        if (message == null) return false;
        return message.matches("\\b(?:https?://|[\\w.%+-]+@)(?!(?:[\\w-]+\\.)*thunely\\.bzh\\b)(?:(?:[\\w-]+\\.)+|(?:[\\w-.]+\\.)+)+[\\w-]{2,4}\\b");
    }
}
