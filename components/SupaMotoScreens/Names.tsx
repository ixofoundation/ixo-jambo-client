import React from 'react'
import styles from './SupaMotoScreens.module.scss';
import IconText from '@components/IconText/IconText';
import Profile from '@icons/profile.svg';

const Names = () => {
    return (
        <div>
            <form>
                <IconText title='' Img={Profile} imgSize={30} />
                <div>
                    <label
                        className={styles.label}
                    >First Name</label><br />
                    <input className={styles.inputs} type='text' placeholder='Name' />
                </div><br />
                <div>
                    <label
                        className={styles.label}
                    >Last Name</label><br />
                    <input className={styles.inputs} type='text' placeholder='Surname' />
                </div>
            </form>
        </div>
    )
}

export default Names
