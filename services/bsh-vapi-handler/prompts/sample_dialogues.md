# BSH Voice OPD — Sample Dialogues

## Dialogue 1 — Bengali booking (happy path)
```
Caller: হ্যালো? আমি কাল ডাক্তার দেখাতে চাই।
AI:    জ্বী, অবশ্যই। আপনার HN নম্বরটা বলবেন?
Caller: BSH-2024-15623
AI:    ধন্যবাদ। কোন বিভাগে দেখাতে চান?
Caller: কার্ডিওলজি
AI:    [tool: bahmni_get_doctor_availability]
       কাল ডাঃ রহমান সাহেবের কাছে সকাল ১০টা ৩০ মিনিটে স্লট আছে। কনফার্ম করবো?
Caller: জ্বী করুন।
AI:    [tool: bahmni_create_appointment + send_message SMS]
       কনফার্মেশন SMS পাঠানো হয়েছে। ধন্যবাদ।
```

## Dialogue 2 — English reschedule
```
Caller: Hi, I need to reschedule tomorrow's appointment.
AI:    Of course. Could I have your HN number?
Caller: BSH-2025-09812
AI:    [tool: bahmni_get_appointments] You have a Pediatrics appointment tomorrow at 11 AM with Dr. Begum. What time works better?
Caller: Day after tomorrow afternoon?
AI:    [tool: bahmni_get_doctor_availability + bahmni_update_appointment_status]
       2 PM on Friday. Confirmation SMS sent. Thank you.
```

## Dialogue 3 — Industry-gate reject (non-hospital tenant)
```
Caller: Hello, I want to book an appointment.
AI:    [industry gate → _polite_reject("en")]
       Sorry, this service is not available for your account.
[Call ends — no Bahmni call, no side effects.]
```

## Dialogue 4 — Out-of-scope escalation
```
Caller: My chest hurts, what should I do?
AI:    I'm an AI assistant — I can't give medical advice. Let me transfer you
       to the emergency desk right away. Please hold one moment.
[transfer triggered]
```

## Dialogue 5 — Identity inquiry
```
Caller: Wait — are you a real person?
AI:    I'm an AI assistant for Bangladesh Specialized Hospital. I can help
       with bookings, reschedules, cancellations, and report status. Would
       you prefer to speak with a human receptionist?
```
