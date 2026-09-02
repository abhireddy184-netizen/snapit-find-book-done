-- 1. Supported US service geography: ZIP prefix -> IANA timezone.
CREATE TABLE IF NOT EXISTS public.us_zip3_zones (
  zip3 text PRIMARY KEY CHECK (zip3 ~ '^[0-9]{3}$'),
  time_zone text NOT NULL
);

GRANT SELECT ON public.us_zip3_zones TO anon;
GRANT SELECT ON public.us_zip3_zones TO authenticated;
GRANT ALL ON public.us_zip3_zones TO service_role;

ALTER TABLE public.us_zip3_zones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Supported service zones are public reference data" ON public.us_zip3_zones;
CREATE POLICY "Supported service zones are public reference data"
  ON public.us_zip3_zones FOR SELECT TO anon, authenticated USING (true);

INSERT INTO public.us_zip3_zones (zip3, time_zone)
SELECT trim(p), z.tz
FROM (VALUES
  ('America/New_York', '005 010 011 012 013 014 015 016 017 018 019 020 021 022 023 024 025 026 027 028 029 030 031 032 033 034 035 036 037 038 039 040 041 042 043 044 045 046 047 048 049 050 051 052 053 054 055 056 057 058 059 060 061 062 063 064 065 066 067 068 069 070 071 072 073 074 075 076 077 078 079 080 081 082 083 084 085 086 087 088 089 100 101 102 103 104 105 106 107 108 109 110 111 112 113 114 115 116 117 118 119 120 121 122 123 124 125 126 127 128 129 130 131 132 133 134 135 136 137 138 139 140 141 142 143 144 145 146 147 148 149 150 151 152 153 154 155 156 157 158 159 160 161 162 163 164 165 166 167 168 169 170 171 172 173 174 175 176 177 178 179 180 181 182 183 184 185 186 187 188 189 190 191 192 193 194 195 196 197 198 199 200 201 202 203 204 205 206 207 208 209 210 211 212 214 215 216 217 218 219 220 221 222 223 224 225 226 227 228 229 230 231 232 233 234 235 236 237 238 239 240 241 242 243 244 245 246 247 248 249 250 251 252 253 254 255 256 257 258 259 260 261 262 263 264 265 266 267 268 270 271 272 273 274 275 276 277 278 279 280 281 282 283 284 285 286 287 288 289 290 291 292 293 294 295 296 297 298 299 300 301 302 303 304 305 306 307 308 309 310 311 312 313 314 315 316 317 318 319 320 321 322 323 326 327 328 329 330 331 332 333 334 335 336 337 338 339 341 342 344 346 347 349 373 374 376 377 378 379 398 399 400 401 402 403 404 405 406 407 408 409 410 411 412 413 414 415 416 417 418 430 431 432 433 434 435 436 437 438 439 440 441 442 443 444 445 446 447 448 449 450 451 452 453 454 455 456 457 458 459 460 461 462 465 466 467 468 469 470 471 472 473 474 475 479 480 481 482 483 484 485 486 487 488 489 490 491 492 493 494 495 496 497 569'),
  ('America/Puerto_Rico', '006 007 009'),
  ('America/St_Thomas', '008'),
  ('America/Chicago', '324 325 350 351 352 354 355 356 357 358 359 360 361 362 363 364 365 366 367 368 369 370 371 372 375 380 381 382 383 384 385 386 387 388 389 390 391 392 393 394 395 396 397 420 421 422 423 424 425 426 427 463 464 476 477 478 498 499 500 501 502 503 504 505 506 507 508 509 510 511 512 513 514 515 516 520 521 522 523 524 525 526 527 528 530 531 532 534 535 537 538 539 540 541 542 543 544 545 546 547 548 549 550 551 553 554 555 556 557 558 559 560 561 562 563 564 565 566 567 570 571 572 573 574 575 576 580 581 582 583 584 585 587 588 600 601 602 603 604 605 606 607 608 609 610 611 612 613 614 615 616 617 618 619 620 622 623 624 625 626 627 628 629 630 631 633 634 635 636 637 638 639 640 641 644 645 646 647 648 649 650 651 652 653 654 655 656 657 658 660 661 662 664 665 666 667 668 669 670 671 672 673 674 675 676 678 680 681 683 684 685 686 687 688 689 690 692 700 701 703 704 705 706 707 708 710 711 712 713 714 716 717 718 719 720 721 722 723 724 725 726 727 728 729 730 731 733 734 735 736 737 738 739 740 741 743 744 745 746 747 748 749 750 751 752 753 754 755 756 757 758 759 760 761 762 763 764 765 766 767 768 769 770 772 773 774 775 776 777 778 779 780 781 782 783 784 785 786 787 788 789 790 791 792 793 794 795 796 797'),
  ('America/Denver', '577 586 590 591 592 593 594 595 596 597 598 599 677 679 691 693 798 799 800 801 802 803 804 805 806 807 808 809 810 811 812 813 814 815 816 820 821 822 823 824 825 826 827 828 829 830 831 832 833 834 835 836 837 840 841 842 843 844 845 846 847 870 871 873 874 875 876 877 878 879 880 881 882 883 884 885 979'),
  ('America/Los_Angeles', '838 889 890 891 893 894 895 897 898 900 901 902 903 904 905 906 907 908 910 911 912 913 914 915 916 917 918 919 920 921 922 923 924 925 926 927 928 930 931 932 933 934 935 936 937 938 939 940 941 942 943 944 945 946 947 948 949 950 951 952 953 954 955 956 957 958 959 960 961 970 971 972 973 974 975 976 977 978 980 981 982 983 984 985 986 988 989 990 991 992 993 994'),
  ('America/Phoenix', '850 851 852 853 855 856 857 859 860 863 864 865'),
  ('Pacific/Honolulu', '967 968'),
  ('America/Anchorage', '995 996 997 998 999')
) AS z(tz, prefixes)
CROSS JOIN LATERAL unnest(string_to_array(z.prefixes, ' ')) AS p
ON CONFLICT (zip3) DO UPDATE SET time_zone = EXCLUDED.time_zone;

-- 2. Server-side ZIP extraction + timezone resolution. Fails closed.
CREATE OR REPLACE FUNCTION public.extract_service_zip(_address text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT (regexp_match(COALESCE(_address, ''), '(\d{5})(?!.*\d{5})'))[1];
$$;

CREATE OR REPLACE FUNCTION public.service_zone_for_zip(_zip text)
RETURNS text
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT z.time_zone FROM public.us_zip3_zones z
   WHERE _zip ~ '^[0-9]{5}$' AND z.zip3 = left(_zip, 3);
$$;

GRANT EXECUTE ON FUNCTION public.extract_service_zip(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.service_zone_for_zip(text) TO anon, authenticated, service_role;

-- 3. Booking columns: server-resolved ZIP + retry-safe idempotency key.
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS service_zip text;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS idempotency_key text;

CREATE UNIQUE INDEX IF NOT EXISTS bookings_customer_idempotency_key
  ON public.bookings (customer_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- 4. Authoritative validation. SECURITY DEFINER so it can actually see the
--    professional's time off, which is owner-readable only.
CREATE OR REPLACE FUNCTION public.enforce_booking_rules()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  actor uuid := auth.uid();
  local_start timestamp;
  local_occupied_end timestamp;
  timing_changed boolean;
  revalidate boolean;
  dow int;
  start_min int;
  occupied_end_min int;
  prof record;
  resolved_zip text;
  resolved_zone text;
  lead_minutes constant int := 120;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF actor IS NOT NULL AND NEW.customer_id IS DISTINCT FROM actor THEN
      RAISE EXCEPTION 'You can only create bookings for your own account'
        USING ERRCODE = 'insufficient_privilege';
    END IF;
    IF NEW.status <> 'pending' THEN
      RAISE EXCEPTION 'A new booking must start as pending' USING ERRCODE = 'check_violation';
    END IF;
    IF NEW.provider_id IS NULL THEN
      RAISE EXCEPTION 'A booking must be assigned to a professional' USING ERRCODE = 'check_violation';
    END IF;
    IF NEW.start_at IS NULL THEN
      RAISE EXCEPTION 'A booking needs a start time' USING ERRCODE = 'check_violation';
    END IF;
    NEW.started_at := NULL;
    NEW.completed_at := NULL;
    NEW.cancelled_at := NULL;
    NEW.overran_window := false;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF NEW.customer_id IS DISTINCT FROM OLD.customer_id
       OR NEW.provider_id IS DISTINCT FROM OLD.provider_id
       OR NEW.job_id IS DISTINCT FROM OLD.job_id THEN
      RAISE EXCEPTION 'The customer, professional and job of a booking cannot be changed'
        USING ERRCODE = 'check_violation';
    END IF;
    -- Lifecycle timestamps and derived fields are set here, never by the app.
    IF NEW.started_at IS DISTINCT FROM OLD.started_at
       OR NEW.completed_at IS DISTINCT FROM OLD.completed_at
       OR NEW.cancelled_at IS DISTINCT FROM OLD.cancelled_at
       OR NEW.overran_window IS DISTINCT FROM OLD.overran_window THEN
      RAISE EXCEPTION 'Job progress timestamps are set by GPB, not by the app'
        USING ERRCODE = 'insufficient_privilege';
    END IF;
    IF NEW.idempotency_key IS DISTINCT FROM OLD.idempotency_key THEN
      RAISE EXCEPTION 'The request key of a booking cannot be changed' USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  timing_changed := TG_OP = 'INSERT'
    OR NEW.start_at IS DISTINCT FROM OLD.start_at
    OR NEW.duration_minutes IS DISTINCT FROM OLD.duration_minutes
    OR NEW.buffer_minutes IS DISTINCT FROM OLD.buffer_minutes
    OR NEW.service_address IS DISTINCT FROM OLD.service_address
    OR NEW.service_timezone IS DISTINCT FROM OLD.service_timezone;

  IF TG_OP = 'UPDATE' AND timing_changed THEN
    IF OLD.status NOT IN ('pending', 'confirmed') THEN
      RAISE EXCEPTION 'A % job cannot be rescheduled', replace(OLD.status::text, '_', ' ')
        USING ERRCODE = 'check_violation';
    END IF;
    IF NEW.start_at IS NULL THEN
      RAISE EXCEPTION 'A booking needs a start time' USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  -- Accepting a job re-checks everything: the world may have moved on.
  revalidate := timing_changed
    OR (TG_OP = 'UPDATE' AND NEW.status = 'confirmed' AND OLD.status = 'pending');

  IF NEW.start_at IS NOT NULL AND revalidate THEN
    IF NEW.start_at < now() + make_interval(mins => lead_minutes) THEN
      RAISE EXCEPTION 'Bookings need at least % hours of lead time', lead_minutes / 60
        USING ERRCODE = 'check_violation';
    END IF;

    -- Service geography is resolved on the server from supported US ZIPs.
    resolved_zip := public.extract_service_zip(NEW.service_address);
    resolved_zone := public.service_zone_for_zip(resolved_zip);
    IF resolved_zone IS NULL THEN
      RAISE EXCEPTION 'GPB only schedules at US service addresses inside the areas we support. Add a valid US ZIP code.'
        USING ERRCODE = 'check_violation';
    END IF;
    IF NEW.service_timezone IS NOT NULL AND NEW.service_timezone <> resolved_zone THEN
      RAISE EXCEPTION 'The service location time zone does not match the service address'
        USING ERRCODE = 'check_violation';
    END IF;
    NEW.service_zip := resolved_zip;
    NEW.service_timezone := resolved_zone;

    -- The professional's own terms are authoritative and may not be edited.
    SELECT accepting_bookings, verification_status, default_duration_minutes, travel_buffer_minutes
      INTO prof
      FROM public.provider_profiles WHERE user_id = NEW.provider_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'That professional is not available on GPB' USING ERRCODE = 'check_violation';
    END IF;
    IF prof.verification_status <> 'verified' THEN
      RAISE EXCEPTION 'This professional is not verified for bookings yet' USING ERRCODE = 'check_violation';
    END IF;
    IF NOT prof.accepting_bookings THEN
      RAISE EXCEPTION 'This professional has paused new bookings' USING ERRCODE = 'check_violation';
    END IF;
    IF NEW.duration_minutes <> prof.default_duration_minutes
       OR NEW.buffer_minutes <> prof.travel_buffer_minutes THEN
      RAISE EXCEPTION 'The job length and travel buffer must match this professional''s settings'
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  -- Derived timing is always recomputed from the reviewed terms.
  IF NEW.start_at IS NOT NULL THEN
    NEW.end_at := NEW.start_at + make_interval(mins => NEW.duration_minutes);
    NEW.occupied_end_at := NEW.end_at + make_interval(mins => COALESCE(NEW.buffer_minutes, 0));
  ELSE
    NEW.end_at := NULL;
    NEW.occupied_end_at := NULL;
  END IF;

  IF NEW.start_at IS NOT NULL AND revalidate THEN
    local_start := NEW.start_at AT TIME ZONE NEW.service_timezone;
    local_occupied_end := NEW.occupied_end_at AT TIME ZONE NEW.service_timezone;

    -- The job AND its travel/setup buffer must fit the 8:00-20:00 window.
    IF local_start::time < TIME '08:00'
       OR local_occupied_end::time > TIME '20:00'
       OR local_occupied_end::date <> local_start::date THEN
      RAISE EXCEPTION 'GPB services run 8:00 AM to 8:00 PM local time; the job and its travel buffer must both fit inside that window'
        USING ERRCODE = 'check_violation';
    END IF;

    dow := EXTRACT(dow FROM local_start)::int;
    start_min := EXTRACT(hour FROM local_start)::int * 60 + EXTRACT(minute FROM local_start)::int;
    occupied_end_min := EXTRACT(hour FROM local_occupied_end)::int * 60
                      + EXTRACT(minute FROM local_occupied_end)::int;

    IF NOT EXISTS (
      SELECT 1 FROM public.provider_availability a
       WHERE a.provider_id = NEW.provider_id
         AND a.weekday = dow
         AND a.start_minute <= start_min
         AND a.end_minute >= occupied_end_min
    ) THEN
      RAISE EXCEPTION 'This professional does not work at that time'
        USING ERRCODE = 'check_violation';
    END IF;

    -- Serialize against concurrent time-off and booking changes for this pro.
    PERFORM pg_advisory_xact_lock(hashtextextended(NEW.provider_id::text, 42));

    IF EXISTS (
      SELECT 1 FROM public.provider_time_off t
       WHERE t.provider_id = NEW.provider_id
         AND tstzrange(t.starts_at, t.ends_at, '[)')
             && tstzrange(NEW.start_at, NEW.occupied_end_at, '[)')
    ) THEN
      RAISE EXCEPTION 'This professional is on time off then' USING ERRCODE = 'check_violation';
    END IF;

    IF EXISTS (
      SELECT 1 FROM public.bookings b
       WHERE b.provider_id = NEW.provider_id
         AND b.id <> NEW.id
         AND b.status IN ('pending', 'confirmed', 'in_progress')
         AND tstzrange(b.start_at, b.occupied_end_at, '[)')
             && tstzrange(NEW.start_at, NEW.occupied_end_at, '[)')
    ) THEN
      RAISE EXCEPTION 'That time was just taken' USING ERRCODE = 'exclusion_violation';
    END IF;
  END IF;

  IF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    IF NOT (
      (OLD.status = 'pending'     AND NEW.status IN ('confirmed', 'cancelled'))
      OR (OLD.status = 'confirmed'   AND NEW.status IN ('in_progress', 'cancelled'))
      OR (OLD.status = 'in_progress' AND NEW.status IN ('completed', 'cancelled'))
    ) THEN
      RAISE EXCEPTION 'Cannot move a booking from % to %', OLD.status, NEW.status
        USING ERRCODE = 'check_violation';
    END IF;

    IF actor IS NOT NULL THEN
      IF NEW.status IN ('confirmed', 'in_progress', 'completed')
         AND actor IS DISTINCT FROM OLD.provider_id THEN
        RAISE EXCEPTION 'Only the assigned professional can accept, start or complete this job'
          USING ERRCODE = 'insufficient_privilege';
      END IF;
      IF NEW.status = 'cancelled'
         AND actor IS DISTINCT FROM OLD.customer_id
         AND actor IS DISTINCT FROM OLD.provider_id THEN
        RAISE EXCEPTION 'Only the customer or the assigned professional can cancel this job'
          USING ERRCODE = 'insufficient_privilege';
      END IF;
    END IF;

    IF NEW.status = 'in_progress' THEN
      NEW.started_at := COALESCE(OLD.started_at, now());
    ELSIF NEW.status = 'completed' THEN
      NEW.completed_at := COALESCE(OLD.completed_at, now());
      IF NEW.end_at IS NOT NULL AND NEW.service_timezone IS NOT NULL
         AND (NEW.completed_at AT TIME ZONE NEW.service_timezone)::time > TIME '20:00' THEN
        NEW.overran_window := true;
      END IF;
    ELSIF NEW.status = 'cancelled' THEN
      NEW.cancelled_at := COALESCE(OLD.cancelled_at, now());
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.enforce_booking_rules() FROM public;

-- 5. A pro cannot block out time that collides with a job they already hold.
CREATE OR REPLACE FUNCTION public.enforce_time_off_rules()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  IF NEW.ends_at <= NEW.starts_at THEN
    RAISE EXCEPTION 'Time off must end after it starts' USING ERRCODE = 'check_violation';
  END IF;
  IF auth.uid() IS NOT NULL AND NEW.provider_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'You can only manage your own time off' USING ERRCODE = 'insufficient_privilege';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(NEW.provider_id::text, 42));

  IF EXISTS (
    SELECT 1 FROM public.bookings b
     WHERE b.provider_id = NEW.provider_id
       AND b.status IN ('pending', 'confirmed', 'in_progress')
       AND b.start_at IS NOT NULL AND b.occupied_end_at IS NOT NULL
       AND tstzrange(b.start_at, b.occupied_end_at, '[)')
           && tstzrange(NEW.starts_at, NEW.ends_at, '[)')
  ) THEN
    RAISE EXCEPTION 'You already have a job booked in that period. Cancel or finish it first.'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.enforce_time_off_rules() FROM public;

DROP TRIGGER IF EXISTS provider_time_off_enforce_rules ON public.provider_time_off;
CREATE TRIGGER provider_time_off_enforce_rules
  BEFORE INSERT OR UPDATE ON public.provider_time_off
  FOR EACH ROW EXECUTE FUNCTION public.enforce_time_off_rules();
