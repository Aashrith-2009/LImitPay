// PocketTrack - Student Expense Management System

const budgetInput = document.getElementById("budget");
const thresholdInput = document.getElementById("threshold");
const expenseForm = document.getElementById("expenseForm");

const warningModal = document.getElementById("warningModal");
const warningText = document.getElementById("warningText");

const STORAGE_KEY = "pocketTrackData";

// Current month key
function getMonthKey() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function formatMoney(amount) {
    return "₹" + Number(amount).toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

// Load saved data
function loadData() {
    try {
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));

        if (saved && typeof saved === "object" && !Array.isArray(saved)) {
            return saved;
        }
    } catch (error) {
        console.error("Unable to load saved data:", error);
    }

    return {
        budget: 0,
        threshold: 0,
        month: getMonthKey(),
        expenses: []
    };
}

let data = loadData();
let pendingExpense = null;

// Automatically reset expenses for a new month
function checkNewMonth() {
    if (data.month !== getMonthKey()) {
        data.month = getMonthKey();
        data.expenses = [];
        saveData();
    }
}

// Save data in browser storage
function saveData() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

// Calculate total expenses
function getTotalSpent() {
    return data.expenses.reduce(
        (total, expense) => total + expense.amount,
        0
    );
}

// Dashboard update
function updateDashboard() {
    const spent = getTotalSpent();
    const remaining = data.budget - spent;

    document.getElementById("totalBudget").textContent =
        formatMoney(data.budget);

    document.getElementById("totalSpent").textContent =
        formatMoney(spent);

    document.getElementById("remaining").textContent =
        formatMoney(remaining);

    document.getElementById("budgetLabel").textContent =
        formatMoney(data.budget) + " Budget";

    const percentage = data.budget > 0
        ? (spent / data.budget) * 100
        : 0;

    const progress = Math.min(percentage, 100);

    document.getElementById("progressFill").style.width =
        progress + "%";

    document.getElementById("percentage").textContent =
        percentage.toFixed(1) + "%";

    const status = document.getElementById("spendingStatus");

    if (data.budget === 0) {
        status.textContent = "Set your monthly budget to get started.";
    } else if (spent > data.budget) {
        status.textContent = "⚠️ Your spending is over budget!";
    } else if (spent > data.threshold) {
        status.textContent = "⚠️ You have crossed your warning threshold.";
    } else {
        status.textContent = "✓ Your spending is within the safe limit.";
    }

    document.getElementById("currentMonth").textContent =
        new Date().toLocaleDateString("en-IN", {
            month: "long",
            year: "numeric"
        });
}

// Save budget settings
document.getElementById("saveBudget").addEventListener("click", function () {

    const budget = Number(budgetInput.value);
    const threshold = Number(thresholdInput.value);

    const message = document.getElementById("budgetMessage");

    if (budgetInput.value.trim() === "" ||
        thresholdInput.value.trim() === "") {
        message.textContent = "Please enter both budget and threshold.";
        message.style.color = "#dc4545";
        return;
    }

    if (!Number.isFinite(budget) ||
        !Number.isFinite(threshold) ||
        budget < 0 || budget > 10000 ||
        !Number.isInteger(budget)) {

        message.textContent =
            "Monthly budget must be a whole amount between ₹0 and ₹10,000.";
        message.style.color = "#dc4545";
        return;
    }

    if (threshold < 0 || threshold > budget) {
        message.textContent =
            "Threshold must be between ₹0 and your monthly budget.";
        message.style.color = "#dc4545";
        return;
    }

    data.budget = budget;
    data.threshold = threshold;

    saveData();
    updateDashboard();

    message.textContent = "✓ Budget settings saved successfully!";
    message.style.color = "#23864a";
});

// Add expense
expenseForm.addEventListener("submit", function (event) {

    event.preventDefault();

    checkNewMonth();

    const description =
        document.getElementById("description").value.trim();

    const amountInput = document.getElementById("amount");
    const amount = Number(amountInput.value);

    const category = document.getElementById("category").value;

    if (!description || !category ||
        amountInput.value.trim() === "" ||
        !Number.isFinite(amount) || amount <= 0) {

        alert("Please enter valid expense details.");
        return;
    }

    if (data.budget <= 0) {
        alert("Please set your monthly budget before making payments.");
        return;
    }

    const spent = getTotalSpent();
    const projectedTotal = spent + amount;

    // Check monthly budget
    if (projectedTotal > data.budget + 0.000001) {

        alert(
            "Payment rejected!\n\n" +
            "This expense exceeds your monthly budget.\n" +
            "Available balance: " + formatMoney(data.budget - spent)
        );

        return;
    }

    const expense = {
        id: Date.now(),
        description: description,
        amount: amount,
        category: category,
        date: new Date().toLocaleDateString("en-IN")
    };

    // Check threshold before recording payment
    if (projectedTotal > data.threshold + 0.000001) {

        pendingExpense = expense;

        warningText.textContent =
            "Your current spending is " + formatMoney(spent) +
            ". This payment will increase it to " +
            formatMoney(projectedTotal) +
            ", exceeding your warning threshold of " +
            formatMoney(data.threshold) + ".";

        warningModal.style.display = "flex";

        return;
    }

    // Payment within threshold
    addExpense(expense);
});

// Record approved expense
function addExpense(expense) {

    data.expenses.unshift(expense);

    saveData();
    renderExpenses();
    updateDashboard();

    expenseForm.reset();

    pendingExpense = null;
}

// Continue payment
document.getElementById("continuePayment")
    .addEventListener("click", function () {

        if (pendingExpense) {
            addExpense(pendingExpense);
        }

        warningModal.style.display = "none";
    });

// Cancel payment
document.getElementById("cancelPayment")
    .addEventListener("click", function () {

        pendingExpense = null;
        warningModal.style.display = "none";
    });

// Close popup by clicking outside
warningModal.addEventListener("click", function (event) {

    if (event.target === warningModal) {
        pendingExpense = null;
        warningModal.style.display = "none";
    }
});

// Escape text before displaying it in HTML
function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, function (char) {
        return {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#039;"
        }[char];
    });
}

// Display expense history
function renderExpenses() {

    const expenseList = document.getElementById("expenseList");

    if (data.expenses.length === 0) {
        expenseList.innerHTML = `
            <tr>
                <td colspan="5" class="empty">
                    No expenses recorded yet.
                </td>
            </tr>
        `;
        return;
    }

    expenseList.innerHTML = data.expenses.map(expense => `

        <tr>
            <td>${escapeHTML(expense.description)}</td>

            <td>${escapeHTML(expense.category)}</td>

            <td>${escapeHTML(expense.date)}</td>

            <td class="amount-cell">
                -${formatMoney(expense.amount)}
            </td>

            <td>
                <button class="delete-btn"
                    data-id="${Number(expense.id)}">
                    Delete
                </button>
            </td>
        </tr>

    `).join("");
}

// Delete individual expense
document.getElementById("expenseList")
    .addEventListener("click", function (event) {

        const button = event.target.closest(".delete-btn");

        if (!button) return;

        const id = Number(button.dataset.id);

        data.expenses = data.expenses.filter(
            expense => expense.id !== id
        );

        saveData();
        renderExpenses();
        updateDashboard();
    });

// Clear all expenses
document.getElementById("clearHistory")
    .addEventListener("click", function () {

        if (data.expenses.length === 0) {
            alert("There are no expenses to clear.");
            return;
        }

        const confirmation = confirm(
            "Are you sure you want to clear all monthly expenses?"
        );

        if (confirmation) {
            data.expenses = [];

            saveData();
            renderExpenses();
            updateDashboard();
        }
    });

// Initial page loading
function initializeApp() {

    checkNewMonth();

    budgetInput.value = data.budget;
    thresholdInput.value = data.threshold;

    updateDashboard();
    renderExpenses();
}

initializeApp();