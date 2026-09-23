# OpenAI Modified Retention Amendment — verbatim, as sent for signature

> **Source:** `Modified_Retention_Amendment_(Advisor-e_Limit.pdf`, DocuSign envelope
> `FB8D9A87-CE49-81A4-832C-6FC1079E3140`, received by Mike Barnes 2026-09-24 and marked *"In
> Process"*. The customer's name was pre-filled as Michael Barnes; neither side had signed.
> **Transcribed word for word — never edit it.** If a signed copy differs, add it beside this
> one rather than changing this file.
>
> What it means for feature design: [`../OPENAI-ZDR-CONSTRAINTS.md`](../OPENAI-ZDR-CONSTRAINTS.md).

---

**MODIFIED RETENTION AMENDMENT**

| | |
|---|---|
| Customer Name | Advisor-e Limited |
| Customer Agreement | OpenAI Business Terms available at https://openai.com/policies/business-terms/ |
| OpenAI Entity | OpenAI OpCo, LLC |
| Org ID(s) | org-OUBqwe8OByhujJMplkl7ufAd |

This Modified Retention Amendment (this "**Amendment**"), dated as of the last date set forth below (the
"**Amendment Effective Date**"), is by and between the OpenAI entity identified above ("**OpenAI**") and Customer and
supplements the customer agreement identified above (the "**Agreement**"). Capitalized terms not defined in this
Amendment shall have the meanings ascribed to them in the Agreement.

1. Modified Retention. After execution of this Amendment, OpenAI will enable Modified Retention as
   requested by Customer for the Org IDs listed above for Customer's business uses, subject to Customer's
   compliance with this Amendment. Once a Modified Retention feature is activated for an Org ID, Customer
   may elect to apply either Zero Data Retention or Modified Abuse Monitoring to individual Projects within
   that Org ID separately.

2. Activation. Customer acknowledges that Customer Content is subject to Modified Retention only if
   Customer's account shows that a Modified Retention feature is activated for the associated Org ID and
   Project in the Account Console. If Customer has multiple Org IDs, Modified Retention must be activated
   separately for each Org ID. If Customer wishes to add additional Org IDs after execution of this Amendment,
   Customer must submit a written request to OpenAI identifying the Org IDs and Customer may be required
   to sign a written confirmation identifying each Org ID to document activation.

3. Customer Responsibility. Customer is responsible for ensuring all traffic that requires Modified Retention is
   directed to Org IDs (as specified in Customer's account) that (i) have been approved for Modified Retention
   and (ii) specify that Modified Retention has been activated in Customer's account. If Customer changes any
   Modified Retention settings for specific Projects, then Customer is responsible for ensuring traffic is
   directed to correctly configured Projects.

4. Customer Use Requirements. Customer will comply with the following requirements when using the
   Services with Modified Retention:

   4.1. If the Customer Application consists of a chat or conversation application, Customer will ensure
   the Customer Application responses are restricted by topic or grounded in trusted documents or
   files (e.g., no general purpose chat functions);

   4.2. Any End Users that generate content that is provided as Input to the Services will be internal only
   (e.g., employees, contractors, agents, affiliates) or will be authenticated using one of the following
   mechanisms: (a) 2 factor/multi-factor authentication; (b) single sign-on; or (c) user ID and
   password where logins are logged for visibility and remediation;

   4.3. Customer will perform moderation by implementing OpenAI's ModAPI or an alternative
   moderation tooling and will notify OpenAI and discuss in good faith if Customer detects notable
   spikes on high severity abuse;

   4.4. If Customer uses the Services with Modified Retention to generate code: (a) Customer will limit
   code generation to internal End Users or, where external End Users use a Customer Application
   for code generation, implement monitoring for misuse; and (b) require a human-in-the-loop to
   review code before it is launched in production;

   4.5. If the Customer Application permits End Users to upload images as Inputs, limit the image inputs
   to low risk and/or topical documents.

5. Restrictions. Customer may not use the Services with Modified Retention to:

   5.1. Provide a chat or conversational application that gives End Users unrestricted access to query the
   Services with general Inputs that generate unrestricted Outputs that are not limited to a particular
   topic or grounded on trusted source documents;

   5.2. Provide unauthenticated access to the Services to End Users that are not employees, agents or
   contractors of Customer;

   5.3. Generate code that can be deployed without human review, convert one programming language
   to another, generate docstrings for functions, or convert natural language to SQL;

   5.4. Allow external users to upload images and files that are transmitted to the Services without
   technical or contractual limits or restrictions; or

   5.5. Provide a Routing Platform.

6. Safety. OpenAI may perform Safety Classification and generate Safety Classifiers. The Safety Classifiers will
   not contain Customer Content, subject to Section 7. In the event the Safety Classifiers indicate persistent
   or material violations of law, OpenAI Policies, or the Agreement, or OpenAI reasonably suspects that
   Customer is in violation of the Agreement (including Sections 3.3(d)-(f) therein), the OpenAI Policies, or this
   Amendment, OpenAI may suspend or revoke approval for Modified Retention upon notice to Customer,
   suspend Customer's access to the Services, or take other action in its sole discretion.

7. Image and File Inputs. Modified Retention does not apply to Inputs that are images or files, which may be
   retained by OpenAI as part of Safety Classification as specified
   at https://platform.openai.com/docs/guides/your-data.

8. Definitions

   "**Agreement**" means the agreement between OpenAI and Customer listed at the top of this Amendment.

   "**Customer**" means the customer listed at the top of this Amendment.

   "**CSAM**" means child sexual abuse material, which includes child pornography as defined under 18 U.S.C. §
   2256 and similar materials restricted under applicable laws.

   "**Downstream Customer**" means a third-party customer of the Routing Platform.

   "**Modified Abuse Monitoring**" means that Customer Content will not be logged for abuse monitoring and
   human review for any API endpoint as specified and subject to the limitations at
   https://platform.openai.com/docs/guides/your-data. Customer may still save or retain Customer Content
   in the Services for application state, as configured by Customer.

   "**Modified Retention**" means, as applicable, Modified Abuse Monitoring or Zero Data Retention.

   "**OpenAI**" means the OpenAI entity listed at the top of this Amendment.

   "**Org ID**" means the organization identifier associated with Customer's account.

   "**Project**" means an API project created by Customer through the administrative functionality of the
   Services.

   "**Routing Platform**" means a Customer Application that enables Downstream Customers to access AI
   models offered by one or more providers.

   "**Safety Classification**" means automated screening of the Customer Content for safety or security
   purposes.

   "**Safety Classifier**" means metadata (including classifier types, dates, counts, and confidence scores) that
   are generated by the Safety Classification process, excluding Customer Content (including summarizations
   of Customer Content) or any portion thereof.

   "**Zero Data Retention**" means that Customer Content will not be logged for abuse monitoring and human
   review and will not be retained, provided that Customer uses an endpoint that is OpenAI has specified is
   eligible for Zero Data Retention as specified, and subject to the limitations, at
   https://platform.openai.com/docs/guides/your-data. If Customer uses an endpoint that is not eligible for
   Zero Data Retention, OpenAI will not log data, but data may be retained for application state.

**Accepted and Agreed:**

| OpenAI OpCo, LLC | Customer |
|---|---|
| Signature: | Signature: |
| Name: | Name: Michael Barnes |
| Title: Authorized Signer | Title: |
| Date: | Date: |
