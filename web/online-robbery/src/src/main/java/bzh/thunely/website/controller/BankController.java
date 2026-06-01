package bzh.thunely.website.controller;

import bzh.thunely.website.model.Transaction;
import bzh.thunely.website.model.User;
import bzh.thunely.website.service.BankService;
import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;

import java.io.File;
import java.math.BigDecimal;
import java.nio.file.Files;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

@Controller
public class BankController {

    private final BankService bankService;
    private final Map<String, Bucket> buckets = new ConcurrentHashMap<>();

    public BankController(BankService bankService) {
        this.bankService = bankService;
    }

    @GetMapping("/dashboard")
    public String dashboard(@AuthenticationPrincipal User user, Model model) {
        populateDashboardModel(user, model);
        return "dashboard";
    }

    @PostMapping("/transfer")
    public String transfer(@RequestParam String recipientUsername,
                           @RequestParam BigDecimal amount,
                           @RequestParam String message,
                           @AuthenticationPrincipal User sender,
                           Model model) {

        Bucket bucket = buckets.computeIfAbsent(sender.getUsername(), k -> Bucket.builder()
                .addLimit(Bandwidth.builder()
                        .capacity(1)
                        .refillGreedy(1, Duration.ofMillis(100))
                        .build())
                .build());

        if (!bucket.tryConsume(1)) {
            populateDashboardModel(sender, model);
            model.addAttribute("error", "Veuillez attendre avant de refaire un virement.");
            return "dashboard";
        }

        String error = bankService.performTransfer(sender, recipientUsername, amount, message);

        if (error != null) {
            populateDashboardModel(sender, model);
            model.addAttribute("error", error);
            return "dashboard";
        }

        return "redirect:/dashboard";
    }

    private void populateDashboardModel(User user, Model model) {
        model.addAttribute("user", user);

        BigDecimal balance = user.getBalance();

        boolean tier1Unlocked = balance.compareTo(new BigDecimal("1000")) >= 0;
        boolean tier2Unlocked = balance.compareTo(new BigDecimal("10000")) >= 0;
        boolean tier3Unlocked = balance.compareTo(new BigDecimal("100000")) >= 0;
        boolean tier4Unlocked = balance.compareTo(new BigDecimal("1000000")) >= 0;

        List<Tier> tiers = new ArrayList<>();
        tiers.add(new Tier("Bronze", "Support prioritaire 24/7", "1 000 €", tier1Unlocked));
        tiers.add(new Tier("Silver", "Carte bancaire en métal", "10 000 €", tier2Unlocked));
        tiers.add(new Tier("Gold", "Gestionnaire de compte dédié", "100 000 €", tier3Unlocked));
        tiers.add(new Tier("Flag", tier4Unlocked ? getFlag() : "???", "1 000 000 €", tier4Unlocked));
        model.addAttribute("tiers", tiers);

        List<Transaction> transactions = bankService.getUserTransactions(user.getId());

        List<TransactionView> transactionViews = transactions.stream()
            .limit(10)
            .map(t -> {
            String otherUser = bankService.getOtherUsername(user.getId(), t);
            boolean isDebit = t.getSenderId().equals(user.getId());
            return new TransactionView(t, otherUser, isDebit);
        }).collect(Collectors.toList());

        model.addAttribute("transactions", transactionViews);
    }

    private static String getFlag() {
        File flag = new File("/flag.txt");
        try {
            return Files.readString(flag.toPath()).trim();
        } catch (Exception e) {
            return "BZHCTF{example_flag_for_testing}";
        }
    }

    public record Tier(String name, String reward, String threshold, boolean unlocked) {}

    public static class TransactionView {
        public Transaction transaction;
        public String otherUser;
        public boolean isDebit;

        public TransactionView(Transaction t, String other, boolean debit) {
            this.transaction = t;
            this.otherUser = other;
            this.isDebit = debit;
        }
    }
}
