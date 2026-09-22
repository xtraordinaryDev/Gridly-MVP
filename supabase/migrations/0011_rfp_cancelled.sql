-- GridLink — allow buyers to cancel an RFP
alter type public.rfp_status add value if not exists 'cancelled';
