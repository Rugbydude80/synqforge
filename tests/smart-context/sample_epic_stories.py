"""
Sample Epic Stories for E-commerce Checkout Flow
These stories represent diverse formats, terminology, and complexity levels.
"""

SAMPLE_EPIC_STORIES = [
    {
        "id": "story_1",
        "title": "User can add items to shopping cart",
        "description": "As a customer, I want to add products to my shopping cart so that I can purchase multiple items together.",
        "acceptanceCriteria": [
            "Given I am browsing the product catalog",
            "When I click the 'Add to Cart' button on a product",
            "Then the item should be added to my cart",
            "And the cart icon should show the updated item count",
            "And I should see a confirmation message"
        ],
        "priority": "high",
        "storyPoints": 3
    },
    {
        "id": "story_2",
        "title": "Customer can view cart contents",
        "description": "As a shopper, I want to see all items in my cart with their details so I can review before checkout.",
        "acceptanceCriteria": [
            "- Cart displays product name, image, and price",
            "- Quantity can be modified",
            "- Items can be removed",
            "- Subtotal is calculated correctly",
            "- Cart persists across sessions"
        ],
        "priority": "high",
        "storyPoints": 2
    },
    {
        "id": "story_3",
        "title": "Apply discount code during checkout",
        "description": "As a customer, I want to enter a promotional code to receive discounts on my order.",
        "acceptanceCriteria": [
            "Given I am on the checkout page",
            "When I enter a valid discount code in the promo code field",
            "Then the discount should be applied to my order total",
            "And I should see the discount amount displayed",
            "When I enter an invalid code",
            "Then I should see an error message",
            "And the discount should not be applied"
        ],
        "priority": "medium",
        "storyPoints": 5
    },
    {
        "id": "story_4",
        "title": "Select shipping method",
        "description": "As a buyer, I want to choose how my order is delivered so I can balance cost and speed.",
        "acceptanceCriteria": [
            "User can select from available shipping options",
            "Standard shipping (5-7 days) is free for orders over $50",
            "Express shipping (2-3 days) costs $9.99",
            "Overnight shipping (1 day) costs $19.99",
            "Shipping cost updates order total in real-time",
            "Estimated delivery date is displayed"
        ],
        "priority": "high",
        "storyPoints": 3
    },
    {
        "id": "story_5",
        "title": "Enter payment information",
        "description": "As a customer, I want to securely enter my payment details to complete my purchase.",
        "acceptanceCriteria": [
            "Given I am on the payment step of checkout",
            "When I enter my credit card number, expiry date, and CVV",
            "Then the form should validate the card details",
            "And I can choose to save the card for future purchases",
            "When I submit invalid payment information",
            "Then I should see specific error messages",
            "And the form should not submit"
        ],
        "priority": "critical",
        "storyPoints": 8
    },
    {
        "id": "story_6",
        "title": "Guest checkout option",
        "description": "As a visitor, I want to purchase without creating an account to save time.",
        "acceptanceCriteria": [
            "- Guest checkout option is available on checkout page",
            "- User can enter email for order confirmation",
            "- No account creation is required",
            "- Order can be tracked via email link",
            "- User can optionally create account after purchase"
        ],
        "priority": "medium",
        "storyPoints": 5
    },
    {
        "id": "story_7",
        "title": "Save shipping address",
        "description": "As a registered user, I want to save my shipping address so I don't have to re-enter it for future orders.",
        "acceptanceCriteria": [
            "Given I am a logged-in user",
            "When I enter a shipping address during checkout",
            "Then I can check a box to save the address",
            "And the address is saved to my account",
            "When I checkout again",
            "Then I can select from my saved addresses",
            "And I can add, edit, or delete saved addresses"
        ],
        "priority": "low",
        "storyPoints": 3
    },
    {
        "id": "story_8",
        "title": "Order confirmation and receipt",
        "description": "As a customer, I want to receive confirmation that my order was placed successfully.",
        "acceptanceCriteria": [
            "After successful payment, user sees order confirmation page",
            "Confirmation includes order number and total amount",
            "Email receipt is sent to customer's email address",
            "Receipt contains order details, items, shipping address, and payment method",
            "User can download PDF receipt",
            "Order appears in user's order history"
        ],
        "priority": "high",
        "storyPoints": 5
    },
    {
        "id": "story_9",
        "title": "Validate inventory before checkout",
        "description": "As a customer, I want to know if items are in stock before I complete my purchase.",
        "acceptanceCriteria": [
            "Given items in cart may have limited inventory",
            "When I proceed to checkout",
            "Then the system should check item availability",
            "If an item is out of stock, I should be notified",
            "And I can remove the item or wait for restock",
            "If inventory changes during checkout, I should be warned",
            "And I can update my cart accordingly"
        ],
        "priority": "high",
        "storyPoints": 5
    },
    {
        "id": "story_10",
        "title": "Calculate taxes and fees",
        "description": "As a customer, I want to see all costs including taxes and fees before I complete my order.",
        "acceptanceCriteria": [
            "Tax is calculated based on shipping address",
            "Sales tax is shown as a separate line item",
            "Processing fees (if any) are displayed",
            "Total order amount includes all fees and taxes",
            "Tax calculation updates when shipping address changes",
            "Breakdown is shown: subtotal, tax, shipping, total"
        ],
        "priority": "medium",
        "storyPoints": 3
    }
]

# Test prompts for generating new stories
TEST_PROMPTS = [
    "User wants to apply discount code",
    "Customer needs to update shipping address",
    "User wants to split payment across multiple cards",
    "Customer needs to add gift wrapping option",
    "User wants to schedule delivery for a specific date"
]

