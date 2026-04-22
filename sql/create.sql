CREATE TABLE test (id int, name varchar(255));

CREATE TABLE account (
    a_id SERIAL PRIMARY KEY,
    a_login varchar(255) NOT NULL UNIQUE,
    a_password varchar(255) NOT NULL,
    a_created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    a_is_company BOOLEAN NOT NULL DEFAULT FALSE /* TRUE if company account, FALSE if acheteur */
);

CREATE TABLE buyer (
    a_id INTEGER REFERENCES account (a_id) ON DELETE CASCADE PRIMARY KEY,
    b_last_name varchar(50) NOT NULL,
    b_first_name varchar(50) NOT NULL
);

CREATE TABLE session (
    a_id INTEGER REFERENCES account (a_id) ON DELETE CASCADE,
    s_token varchar(64) NOT NULL,
    s_created_at TIMESTAMP NOT NULL,
    s_expires_at TIMESTAMP NOT NULL
);

CREATE TABLE password_recovery (
    a_id INTEGER REFERENCES account (a_id) ON DELETE CASCADE,
    pr_token varchar(64) NOT NULL,
    pr_created_at TIMESTAMP NOT NULL,
    PRIMARY KEY(a_id, pr_token)
);

CREATE TABLE company (
    a_id INTEGER REFERENCES account (a_id) ON DELETE CASCADE PRIMARY KEY,
    c_name varchar(50) NOT NULL
);

CREATE TABLE movie (
    m_id INTEGER PRIMARY KEY,
    m_title varchar(255) NOT NULL
);

CREATE TABLE article (
    art_id SERIAL PRIMARY KEY,
    art_name varchar(128) NOT NULL,
    art_description varchar(2000) NOT NULL,
    art_price INTEGER NOT NULL,
    art_min_bidding INTEGER NOT NULL,
    art_auction_start TIMESTAMP NOT NULL,
    art_auction_end TIMESTAMP NOT NULL,
    c_id INTEGER REFERENCES company (a_id) ON DELETE CASCADE,
    m_id INTEGER REFERENCES movie (m_id)
);

CREATE TABLE article_image (
    art_id INTEGER REFERENCES article (art_id) ON DELETE CASCADE,
    img_path varchar(255) NOT NULL
);

CREATE TABLE bid (
    b_id INTEGER REFERENCES buyer (a_id) ON DELETE CASCADE,
    art_id INTEGER REFERENCES article (art_id) ON DELETE CASCADE,
    amount INTEGER NOT NULL
);

CREATE TABLE interests (
    b_id INTEGER REFERENCES buyer (a_id) ON DELETE CASCADE,
    art_id INTEGER REFERENCES article (art_id) ON DELETE CASCADE,
    PRIMARY KEY(b_id, art_id)
);

CREATE TABLE aquired (
    b_id INTEGER REFERENCES buyer (a_id) ON DELETE CASCADE,
    art_id INTEGER REFERENCES article (art_id) ON DELETE CASCADE,
    is_paid BOOLEAN NOT NULL,
    PRIMARY KEY(b_id, art_id)
);

CREATE TABLE notification (
    n_id SERIAL PRIMARY KEY,
    a_id INTEGER REFERENCES account (a_id) ON DELETE CASCADE,
    n_date TIMESTAMP NOT NULL,
    n_text varchar(300) NOT NULL
);


-- TRIGGERS

-- Gestion de la fin d'une enchère, on ajoute l'article dans les articles possédés par l'acheteur
-- et on envoie une notification à l'acheteur et l'entreprise
CREATE TRIGGER t_auction_end_i
BEFORE INSERT ON bid
BEGIN
    IF (SELECT count(*) FROM article a WHERE a.art_id = new.art_id AND art_auction_end > now()) == 0 THEN 
        INSERT INTO aquired (b_id, art_id) SELECT b_id, art_id FROM bid b WHERE new.art_id = b.art_id ORDER BY b.amount DESC LIMIT 1;
        RAISE EXCEPTION 'Cette enchère est fini';
    END IF;
END;

CREATE TRIGGER t_aquired_i
AFTER INSERT ON aquired
BEGIN
    INSERT INTO notification (a_id, n_date, n_text)
        VALUES (new.b_id, now, 'Vous avez gagné l''enchère sur ' || (SELECT art_name FROM article a WHERE a.art_id = new.art_id) || ', il ne vous reste plus qu''à payer.');
    INSERT INTO notification (a_id, n_date, n_text) VALUES ((SELECT c_id FROM article a WHERE a.art_id = new.art_id), now, (SELECT b_last_name || ' ' || b_first_name FROM buyer b WHERE new.b_id = b.a_id) || ' a gagné l''enchère sur ' || (SELECT art_name FROM article a WHERE a.art_id = new.art_id));
END;


-- On notifie l'entreprise quand l'acheteur a payé un produit
CREATE TRIGGER t_aquired_u
AFTER UPDATE ON aquired
BEGIN 
    IF new.is_paid THEN
        INSERT INTO notification (a_id, n_date, n_text) VALUES ((SELECT c_id FROM article a WHERE a.art_id = new.art_id), now, (SELECT b_last_name || ' ' || b_first_name FROM buyer b WHERE new.b_id = b.a_id) || ' a payé l''article ' || (SELECT art_name FROM article a WHERE a.art_id = new.art_id));
    END IF;
END;

-- PERMISSONS
ALTER TABLE test OWNER TO replikas_usr;
ALTER TABLE account OWNER TO replikas_usr;
ALTER TABLE buyer OWNER TO replikas_usr;
ALTER TABLE session OWNER TO replikas_usr;
ALTER TABLE password_recovery OWNER TO replikas_usr;
ALTER TABLE company OWNER TO replikas_usr;
ALTER TABLE article OWNER TO replikas_usr;
ALTER TABLE movie OWNER TO replikas_usr;
ALTER TABLE article_image OWNER TO replikas_usr;
ALTER TABLE bid OWNER TO replikas_usr;
ALTER TABLE interests OWNER TO replikas_usr;
ALTER TABLE aquired OWNER TO replikas_usr;
ALTER TABLE notification OWNER TO replikas_usr;