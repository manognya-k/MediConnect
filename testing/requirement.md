# Requirements Document
## Project: BookedIn – Book Readers Networking Platform

| Field | Details |
|---|---|
| **Project Name** | BookedIn |
| **Document Type** | Requirements Document |
| **Version** | 1.0 |
| **Date** | 28-Apr-2026 |
| **Reference** | Functional Requirement Document v1.0 |

---

## Module 1: Landing Page

| Req ID | Requirement Description |
|---|---|
| REQ_01 | The landing page shall display the "BookedIn" logo at the top-left corner. |
| REQ_02 | The landing page shall display "Log In" and "Sign Up" buttons at the top-right corner. |
| REQ_03 | The hero section shall display the headline "Let's connect ?" and a "Get Started" CTA button. |
| REQ_04 | Clicking "Get Started" shall navigate the user to the account creation / Sign Up flow. |
| REQ_05 | The landing page shall display 7 alternating content blocks describing core platform features. |
| REQ_06 | The landing page shall use a high-contrast Obsidian and Crimson color theme. |
| REQ_07 | An AI Chatbot icon shall be persistently anchored at the bottom-right corner of the landing page. |
| REQ_08 | Clicking the AI Chatbot icon shall open/expand the chatbot window. |
| REQ_09 | The landing page shall be responsive across desktop, tablet, and mobile devices. |

---

## Module 2: Authentication

| Req ID | Requirement Description |
|---|---|
| REQ_10 | The system shall allow a new user to register using a unique email address and valid credentials. |
| REQ_11 | The system shall prevent registration with a duplicate email address and display an appropriate error. |
| REQ_12 | The system shall validate that all mandatory fields are filled during registration. |
| REQ_13 | The system shall allow a registered user to log in with valid credentials. |
| REQ_14 | The system shall display an error message when login is attempted with invalid credentials. |
| REQ_15 | The system shall allow a logged-in user to log out and redirect to the landing page. |
| REQ_16 | The system shall maintain the user session after a page refresh. |

---

## Module 3: Profile Page

| Req ID | Requirement Description |
|---|---|
| REQ_17 | The profile page shall display navigation links: Home, Library, and Messages at the center. |
| REQ_18 | The "Profile" tab shall be highlighted in Crimson to indicate the active page. |
| REQ_19 | The User Identity Card shall display stats: Books Read, Currently Reading, and Connections. |
| REQ_20 | The User Identity Card shall display the user's bio and membership start date. |
| REQ_21 | The profile page shall provide an "Edit Profile" button to allow metadata updates. |
| REQ_22 | Changes made via "Edit Profile" shall be saved and immediately reflected on the profile page. |
| REQ_23 | Favorite Genres shall be displayed as Crimson badges on the profile page. |
| REQ_24 | Favorite Books shall be displayed as a visual gallery of top-rated book covers. |
| REQ_25 | The 2026 Reading Goal shall be displayed as a Crimson progress bar with percentage metric. |
| REQ_26 | The progress bar percentage shall accurately reflect books read against the annual goal. |
| REQ_27 | The AI Chatbot icon shall be persistently visible at the bottom-right of the profile page. |

---

## Module 4: Library Page

| Req ID | Requirement Description |
|---|---|
| REQ_28 | The library page shall display navigation links: Home, Library, Messages, and Profile. |
| REQ_29 | The "Library" tab shall be highlighted in Crimson to indicate the active page. |
| REQ_30 | The library page shall display a "Currently Reading" shelf with active book titles. |
| REQ_31 | Each book in "Currently Reading" shall show a Crimson progress bar and percentage complete. |
| REQ_32 | The library page shall display a "Completed" shelf with finished book cover art. |
| REQ_33 | The library page shall display a "Want to Read" shelf for wishlisted titles. |
| REQ_34 | Each shelf shall display a numerical badge indicating the total number of books on that shelf. |
| REQ_35 | The user shall be able to add a book to the "Want to Read" shelf. |
| REQ_36 | The user shall be able to move a book from "Want to Read" to "Currently Reading." |
| REQ_37 | The user shall be able to mark a book as "Completed" from the "Currently Reading" shelf. |
| REQ_38 | The numerical badge count on each shelf shall update dynamically when books are added or removed. |

---

## Module 5: AI Chatbot

| Req ID | Requirement Description |
|---|---|
| REQ_39 | The AI Chatbot icon shall be persistently visible at the bottom-right on all pages. |
| REQ_40 | Clicking the chatbot icon shall expand the BookedIn AI window. |
| REQ_41 | The chatbot shall accept natural language input (e.g., genre names like "Fantasy, Mystery"). |
| REQ_42 | The chatbot shall return book recommendations based on the user's genre input. |
| REQ_43 | The chatbot shall support movie-based book recommendations. |
| REQ_44 | The chatbot shall handle empty input gracefully with a prompt or error message. |
| REQ_45 | The chatbot window shall be closable/minimizable by the user. |
| REQ_46 | The chatbot shall return responses within an acceptable time limit (3–5 seconds). |

---

## Module 6: Navigation

| Req ID | Requirement Description |
|---|---|
| REQ_47 | Clicking "Home" in the navigation bar shall navigate the user to the home feed. |
| REQ_48 | Clicking "Library" in the navigation bar shall navigate the user to the library page. |
| REQ_49 | Clicking "Messages" in the navigation bar shall navigate the user to the messages page. |
| REQ_50 | Clicking "Profile" in the navigation bar shall navigate the user to the profile page. |
| REQ_51 | The currently active page tab shall always be highlighted in Crimson in the navigation bar. |

---
