# Client brief — plain text fallback

The interactive version lives at the artifact link and is easier for the client (it saves
as he types and copies itself into WhatsApp). **Use this file only if that link will not
open on his phone** — paste it into WhatsApp in parts and let him reply by number.

Do not ask for PAN, GST or bank account *numbers* over WhatsApp. Ask only whether he
*has* them; collect the numbers later over a call or in person.

---

## Part 1 of 5 — Your shop

```
Namaste 🙏 Website banane ke liye kuch details chahiye.
Jitna aap jaante hain utna hi likhiye — baaki baad mein pooch lenge.
Reply kar dijiye number ke saath.

1. Dukaan / brand ka naam jo website par dikhe?
2. Malik ka pura naam?
3. Grahak kis number par contact karein? (WhatsApp)
4. Order ke liye email address?
5. Dukaan ka pura pata, pincode ke saath?
6. Dukaan kis saal se chal rahi hai?
7. GST registration hai? (Haan / Nahi / Karwa rahe hain)
8. Aapke paas kya-kya taiyar hai? (sirf haan/nahi likhiye, number mat bhejiye)
   - PAN card
   - GST certificate
   - Current bank account
   - Cancelled cheque
   - Dukaan ke signboard ki photo
```

## Part 2 of 5 — What you sell, and how you price it

```
9.  Aap kya-kya banate/bechte hain?
    Rings, Payal, Bichhiya, Bracelet, Kada, Chain, Pendant, Earrings,
    Nath, Necklace, Mangalsutra, Kamarbandh, Bachchon ki jewellery,
    Murti/puja saman, Rudraksh/Yantra, Silver coins, Gift items
10. Shuddhata kaun si? (925 sterling / 999 fine / plated / oxidised)
11. BIS hallmark hai? (Haan sab par / Kuch par / Nahi)
12. Abhi kitne design online daal sakte hain?
13. Mahine mein kitne naye design aate hain?
14. Ready stock bechte hain ya order par banate hain, ya dono?
15. Ring/kada mein size ki zaroorat hai? (Haan, Indian size 8-24 / Free size / Nahi)

⭐ SABSE ZAROORI SAWAAL:
16. Ek item ka daam kaise tay hota hai?
    (a) Har design ka fixed daam hota hai, ya
    (b) Wazan x aaj ka chandi ka bhav + making charge
17. Agar (b), to bhav kaun update karega aur kitni baar? (roz subah?)
18. Making charge kitna hai? (e.g. Rs 12 per gram, ya 15%)
19. Product page par wazan aur shuddhata dikhani hai?
20. Sabse sasta aur sabse mehnga item kitne ka hai?
21. Dikhaye gaye daam mein GST shamil ho, ya checkout par jude?
```

## Part 3 of 5 — Payment, delivery, returns

```
22. Kaun se payment option chahiye?
    UPI / Card / Net banking / Wallet / Cash on Delivery / Bank transfer
23. Razorpay ya koi payment gateway account pehle se hai?
24. COD par koi limit ya extra charge? (e.g. Rs 5000 tak, Rs 50 extra)
25. Custom order par kitna advance lete hain?

26. Kaun si courier use karenge?
    India Post / Delhivery / DTDC / Blue Dart / Shiprocket / local delivery
27. Kitne rupay se upar free delivery?
28. Pack karne mein kitne din, pahunchne mein kitne din?
29. Delivery kahan tak? (Pure India / sirf apne state / India + videsh)
30. Packing kaisi hogi? Insurance hai?

31. Kitne din mein return le sakte hain?
32. Return par kya denge? (Paisa wapas / Exchange / Store credit / Return nahi)
33. Purani chandi wapas kharidte hain? (Lifetime buyback / kuch katauti ke saath / Nahi)
34. Kaun se item kabhi wapas nahi honge? (e.g. naam likhe hue, custom size)
35. Agar parcel toota hua pahunche to kya karenge?
```

## Part 4 of 5 — Offers, photos, look

```
36. Pehle order par kitni chhoot? (e.g. 10% off, code WELCOME10)
37. Kaun se offer chalana chahenge?
    Tyohar sale / Buy 1 Get 1 / Rs 999 se kam wala section / Combo set / Abhi koi nahi
38. Instagram / Facebook / YouTube ke link?
39. Har product par "WhatsApp par order karein" button chahiye?
40. Grahak photo ke saath review likh sakein? (Haan / Haan par pehle main dekhunga / Nahi)

41. Product ki photo kaun khinchega? (Main mobile se / photographer / dono)
42. Kitne product ki photo already taiyar hai? (Sab / aadhe / kuch / abhi koi nahi)
43. Photo ka background kaisa hota hai? (Safed / kala velvet / model pehne hue / mila-jula)
44. Ek product ki kitni photo de sakte hain? (1 / 2-3 / 4 ya zyada)
45. Chhota video bhi bana sakte hain?

46. Logo hai? (Haan file hai / hai par blurry / nahi, banwana hai)
47. Ek line mein apni dukaan bataiye
48. Apni kahani likhiye — kaun banata hai, kitne saal se, kis baat par garv hai
49. Website English mein ho, Hindi mein, ya dono?
50. Koi website pasand aayi? Link bhejiye aur bataiye kya achha laga
```

## Part 5 of 5 — Website and running it

```
51. Website ka naam kya rakhein? (2-3 choice likhiye, e.g. shreesilverarts.com)
52. Pehle se koi domain ya website hai?
53. Amazon / Meesho / Instagram shop par bechte hain? Link dijiye
54. Roz ke order kaun dekhega? Kitne log?
55. Computer kitna chala lete hain? (Sirf mobile / mobile aasan hai / dono theek)
56. Website kab tak chalu chahiye? (e.g. Diwali se pehle)
57. Har mahine ka kitna kharch theek rahega? (hosting + domain)
58. Aur kuch jo website par chahiye? Khulkar likhiye.
```

---

## Notes for the developer

Answers to **16, 17 and 21** decide the schema. Do not start the product model until
those three are answered.

Answers to **41 to 45** decide how much photo tooling the admin needs. "Mobile, mixed
background, 1 photo" means the upload flow must crop, pad to square and normalise the
background automatically.

Answer **55** decides the admin layout. "Sirf mobile" means the product form is a
single-column stepper, not a two-pane desktop editor.
